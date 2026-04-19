import { NextRequest, NextResponse } from 'next/server';
import type { BlogPostStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/slug';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type AdminUser = {
  id: string;
  role: UserRole;
};

type BlogPostListQuery = {
  page: number;
  limit: number;
  search: string;
  status: BlogPostStatus | null;
  categoryId: string | null;
  tagId: string | null;
};

type BlogPostCreatePayload = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  categoryId: string | null;
  tagIds: string[];
  status: BlogPostStatus;
  publishedAt: Date | null;
  metaTitle: string | null;
  metaDescription: string | null;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type ListPostsArgs = {
  where: Record<string, unknown>;
  page: number;
  limit: number;
};

type BlogPostRow = {
  tags: Array<{ tag: unknown }>;
  [key: string]: unknown;
};

type AdminBlogPostsDeps = {
  requireAdmin: () => Promise<AdminUser>;
  listPosts: (args: ListPostsArgs) => Promise<BlogPostRow[]>;
  countPosts: (where: Record<string, unknown>) => Promise<number>;
  findPostBySlug: (slug: string) => Promise<{ id: string } | null>;
  findCategoryById: (id: string) => Promise<{ id: string } | null>;
  findTagsByIds: (ids: string[]) => Promise<Array<{ id: string }>>;
  createPost: (args: {
    adminId: string;
    payload: BlogPostCreatePayload;
  }) => Promise<BlogPostRow>;
  writeAdminAudit?: (payload: {
    module: string;
    entity: string;
    entityId: string;
    mutationType: string;
    summary: string;
    actorUserId?: string | null;
    actorRole?: UserRole | null;
    correlation: {
      requestId: string;
      route: string;
      httpMethod: string;
      orderId?: string | null;
      paymentId?: string | null;
      transactionId?: string | null;
      attempt?: number | null;
    };
  }) => Promise<void>;
};

const ALLOWED_STATUSES = new Set<BlogPostStatus>([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

const includeFields = {
  author: { select: { id: true, name: true } },
  category: true,
  tags: { include: { tag: true } },
};

const defaultDeps: AdminBlogPostsDeps = {
  requireAdmin,
  listPosts: ({ where, page, limit }) =>
    prisma.blogPost.findMany({
      where,
      include: includeFields,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  countPosts: (where) => prisma.blogPost.count({ where }),
  findPostBySlug: (slug) =>
    prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    }),
  findCategoryById: (id) =>
    prisma.blogCategory.findUnique({
      where: { id },
      select: { id: true },
    }),
  findTagsByIds: (ids) =>
    prisma.blogTag.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    }),
  createPost: ({ adminId, payload }) =>
    prisma.blogPost.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        content: payload.content,
        coverUrl: payload.coverUrl,
        categoryId: payload.categoryId,
        authorId: adminId,
        status: payload.status,
        publishedAt: payload.publishedAt,
        metaTitle: payload.metaTitle,
        metaDescription: payload.metaDescription,
        tags: payload.tagIds.length
          ? { create: payload.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: includeFields,
    }),
  writeAdminAudit: writeAdminActionAuditLog,
};


function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

function parseListQuery(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);
  const page = normalizePositiveInt(searchParams.get('page'), 1);
  const limit = normalizePositiveInt(searchParams.get('limit'), 20, 50);

  const search = (searchParams.get('search') ?? '').trim();
  const categoryId = (searchParams.get('categoryId') ?? '').trim() || null;
  const tagId = (searchParams.get('tagId') ?? '').trim() || null;
  const statusRaw = (searchParams.get('status') ?? '').trim();

  if (!statusRaw) {
    return {
      page,
      limit,
      search,
      categoryId,
      tagId,
      status: null,
    } satisfies BlogPostListQuery;
  }

  if (!ALLOWED_STATUSES.has(statusRaw as BlogPostStatus)) {
    return { error: 'Invalid status filter' } as const;
  }

  return {
    page,
    limit,
    search,
    categoryId,
    tagId,
    status: statusRaw as BlogPostStatus,
  } satisfies BlogPostListQuery;
}

function parseDateInput(raw: unknown, fieldName: string) {
  if (raw === undefined || raw === null || raw === '') return { value: null as Date | null };
  if (typeof raw !== 'string') {
    return { error: `${fieldName} must be a valid ISO datetime string` } as const;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldName} must be a valid ISO datetime string` } as const;
  }
  return { value: parsed };
}

function normalizeOptionalTrimmedString(raw: unknown, fieldName: string) {
  if (raw === undefined || raw === null || raw === '') return { value: null as string | null };
  if (typeof raw !== 'string') return { error: `${fieldName} must be a string` } as const;
  return { value: raw.trim() || null };
}

function normalizeTagIds(raw: unknown) {
  if (raw === undefined) return { value: [] as string[] };
  if (!Array.isArray(raw)) return { error: 'tagIds must be an array of strings' } as const;

  const normalized = raw
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);
  if (normalized.length !== raw.length) {
    return { error: 'tagIds must be an array of strings' } as const;
  }
  return { value: Array.from(new Set(normalized)) };
}

function parseCreatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }

  const body = raw as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return { error: 'title is required' } as const;

  const slug = slugify(
    (typeof body.slug === 'string' ? body.slug : title) || '',
  );
  if (!slug) return { error: 'slug is required' } as const;

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return { error: 'content is required' } as const;

  const statusRaw = body.status ?? 'DRAFT';
  if (typeof statusRaw !== 'string' || !ALLOWED_STATUSES.has(statusRaw as BlogPostStatus)) {
    return { error: 'Invalid post status' } as const;
  }
  const status = statusRaw as BlogPostStatus;

  const excerptResult = normalizeOptionalTrimmedString(body.excerpt, 'excerpt');
  if ('error' in excerptResult) return { error: excerptResult.error } as const;
  const coverUrlResult = normalizeOptionalTrimmedString(body.coverUrl, 'coverUrl');
  if ('error' in coverUrlResult) return { error: coverUrlResult.error } as const;
  const metaTitleResult = normalizeOptionalTrimmedString(body.metaTitle, 'metaTitle');
  if ('error' in metaTitleResult) return { error: metaTitleResult.error } as const;
  const metaDescriptionResult = normalizeOptionalTrimmedString(
    body.metaDescription,
    'metaDescription',
  );
  if ('error' in metaDescriptionResult) {
    return { error: metaDescriptionResult.error } as const;
  }

  const categoryIdResult = normalizeOptionalTrimmedString(body.categoryId, 'categoryId');
  if ('error' in categoryIdResult) return { error: categoryIdResult.error } as const;

  const tagIdsResult = normalizeTagIds(body.tagIds);
  if ('error' in tagIdsResult) return { error: tagIdsResult.error } as const;

  const publishedAtResult = parseDateInput(body.publishedAt, 'publishedAt');
  if ('error' in publishedAtResult) return { error: publishedAtResult.error } as const;
  const publishedAt =
    status === 'PUBLISHED'
      ? (publishedAtResult.value ?? new Date())
      : null;

  return {
    payload: {
      title,
      slug,
      excerpt: excerptResult.value,
      content,
      coverUrl: coverUrlResult.value,
      categoryId: categoryIdResult.value,
      tagIds: tagIdsResult.value,
      status,
      publishedAt,
      metaTitle: metaTitleResult.value,
      metaDescription: metaDescriptionResult.value,
    } satisfies BlogPostCreatePayload,
  } as const;
}

export async function handleAdminBlogPostsGetRequest(
  requestUrl: string,
  deps: AdminBlogPostsDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const parsed = parseListQuery(requestUrl);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  const where: Record<string, unknown> = {};
  if (parsed.search) {
    where.OR = [
      { title: { contains: parsed.search, mode: 'insensitive' } },
      { excerpt: { contains: parsed.search, mode: 'insensitive' } },
    ];
  }
  if (parsed.status) where.status = parsed.status;
  if (parsed.categoryId) where.categoryId = parsed.categoryId;
  if (parsed.tagId) where.tags = { some: { tagId: parsed.tagId } };

  const [posts, total] = await Promise.all([
    deps.listPosts({ where, page: parsed.page, limit: parsed.limit }),
    deps.countPosts(where),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        posts: posts.map((post) => ({
          ...post,
          tags: post.tags.map((t) => t.tag),
        })),
        pagination: {
          page: parsed.page,
          limit: parsed.limit,
          total,
          totalPages: Math.ceil(total / parsed.limit),
        },
      },
    },
  };
}

export async function handleAdminBlogPostsPostRequest(
  request: NextRequest,
  deps: AdminBlogPostsDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();

  const parsed = parseCreatePayload(await request.json());
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  const existing = await deps.findPostBySlug(parsed.payload.slug);
  if (existing) {
    return { status: 400, body: { success: false, error: 'Slug already exists' } };
  }

  if (parsed.payload.categoryId) {
    const category = await deps.findCategoryById(parsed.payload.categoryId);
    if (!category) {
      return { status: 400, body: { success: false, error: 'Category not found' } };
    }
  }

  if (parsed.payload.tagIds.length > 0) {
    const existingTags = await deps.findTagsByIds(parsed.payload.tagIds);
    if (existingTags.length !== parsed.payload.tagIds.length) {
      return {
        status: 400,
        body: { success: false, error: 'One or more tags do not exist' },
      };
    }
  }

  const post = await deps.createPost({
    adminId: admin.id,
    payload: parsed.payload,
  });

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'POST';
    const postId =
      typeof ((post as unknown) as { id?: unknown }).id === 'string'
        ? ((post as unknown) as { id: string }).id
        : 'unknown';
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'blog_post',
      entityId: postId,
      mutationType: 'CREATE',
      summary: `Created blog post ${parsed.payload.title}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/posts',
      ),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        ...post,
        tags: post.tags.map((t) => t.tag),
      },
    },
  };
}

// GET /api/admin/blog/posts
export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminBlogPostsGetRequest(request.url);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin blog posts list error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// POST /api/admin/blog/posts
export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminBlogPostsPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin create blog post error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


