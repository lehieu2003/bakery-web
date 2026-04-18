import { NextRequest, NextResponse } from 'next/server';
import type { BlogPostStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/slug';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type Params = { params: Promise<{ id: string }> };

type AdminUser = {
  id: string;
  role: UserRole;
};

type BlogPostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  categoryId: string | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  metaTitle: string | null;
  metaDescription: string | null;
};

type BlogPostRow = {
  tags: Array<{ tag: unknown }>;
  [key: string]: unknown;
};

type BlogPostUpdatePayload = Partial<{
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  categoryId: string | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  metaTitle: string | null;
  metaDescription: string | null;
}>;

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type AdminBlogPostByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findPostById: (id: string) => Promise<BlogPostRecord | null>;
  findPostDetailById: (id: string) => Promise<BlogPostRow | null>;
  findPostBySlug: (slug: string) => Promise<{ id: string } | null>;
  findCategoryById: (id: string) => Promise<{ id: string } | null>;
  findTagsByIds: (ids: string[]) => Promise<Array<{ id: string }>>;
  updatePostWithTagsById: (args: {
    id: string;
    payload: BlogPostUpdatePayload;
    tagIds?: string[];
  }) => Promise<BlogPostRow>;
  deletePostById: (id: string) => Promise<void>;
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

const defaultDeps: AdminBlogPostByIdDeps = {
  requireAdmin,
  findPostById: (id) =>
    prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverUrl: true,
        categoryId: true,
        status: true,
        publishedAt: true,
        metaTitle: true,
        metaDescription: true,
      },
    }),
  findPostDetailById: (id) =>
    prisma.blogPost.findUnique({
      where: { id },
      include: includeFields,
    }),
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
  updatePostWithTagsById: ({ id, payload, tagIds }) =>
    prisma.$transaction(async (tx) => {
      if (tagIds) {
        await tx.blogPostTag.deleteMany({ where: { postId: id } });
        if (tagIds.length > 0) {
          await tx.blogPostTag.createMany({
            data: tagIds.map((tagId) => ({ postId: id, tagId })),
          });
        }
      }
      return tx.blogPost.update({
        where: { id },
        data: payload,
        include: includeFields,
      });
    }),
  deletePostById: async (id) => {
    await prisma.blogPost.delete({ where: { id } });
  },
  writeAdminAudit: writeAdminActionAuditLog,
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function normalizeOptionalTrimmedString(raw: unknown, fieldName: string) {
  if (raw === undefined) return { skipped: true as const };
  if (raw === null || raw === '') return { value: null as string | null };
  if (typeof raw !== 'string') return { error: `${fieldName} must be a string` } as const;
  return { value: raw.trim() || null };
}

function parseDateInput(raw: unknown, fieldName: string) {
  if (raw === undefined) return { skipped: true as const };
  if (raw === null || raw === '') return { value: null as Date | null };
  if (typeof raw !== 'string') {
    return { error: `${fieldName} must be a valid ISO datetime string` } as const;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldName} must be a valid ISO datetime string` } as const;
  }
  return { value: parsed };
}

function normalizeTagIds(raw: unknown) {
  if (raw === undefined) return { skipped: true as const };
  if (!Array.isArray(raw)) return { error: 'tagIds must be an array of strings' } as const;
  const normalized = raw
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);
  if (normalized.length !== raw.length) {
    return { error: 'tagIds must be an array of strings' } as const;
  }
  return { value: Array.from(new Set(normalized)) };
}

function parseUpdatePayload(raw: unknown, existing: BlogPostRecord) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }
  const body = raw as Record<string, unknown>;
  const payload: BlogPostUpdatePayload = {};
  let tagIds: string[] | undefined;
  const hasStatusInput = body.status !== undefined;
  const hasPublishedAtInput = body.publishedAt !== undefined;

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { error: 'title must be a non-empty string' } as const;
    }
    payload.title = body.title.trim();
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return { error: 'content must be a non-empty string' } as const;
    }
    payload.content = body.content.trim();
  }

  const slugSource = body.slug !== undefined ? body.slug : undefined;
  if (slugSource !== undefined) {
    if (typeof slugSource !== 'string') {
      return { error: 'slug must be a string' } as const;
    }
    const normalizedSlug = slugify(slugSource || String(body.title ?? existing.title));
    if (!normalizedSlug) return { error: 'slug is required' } as const;
    payload.slug = normalizedSlug;
  }

  const excerptResult = normalizeOptionalTrimmedString(body.excerpt, 'excerpt');
  if ('error' in excerptResult) return { error: excerptResult.error } as const;
  if ('value' in excerptResult) payload.excerpt = excerptResult.value;

  const coverUrlResult = normalizeOptionalTrimmedString(body.coverUrl, 'coverUrl');
  if ('error' in coverUrlResult) return { error: coverUrlResult.error } as const;
  if ('value' in coverUrlResult) payload.coverUrl = coverUrlResult.value;

  const metaTitleResult = normalizeOptionalTrimmedString(body.metaTitle, 'metaTitle');
  if ('error' in metaTitleResult) return { error: metaTitleResult.error } as const;
  if ('value' in metaTitleResult) payload.metaTitle = metaTitleResult.value;

  const metaDescriptionResult = normalizeOptionalTrimmedString(
    body.metaDescription,
    'metaDescription',
  );
  if ('error' in metaDescriptionResult) {
    return { error: metaDescriptionResult.error } as const;
  }
  if ('value' in metaDescriptionResult) payload.metaDescription = metaDescriptionResult.value;

  const categoryIdResult = normalizeOptionalTrimmedString(body.categoryId, 'categoryId');
  if ('error' in categoryIdResult) return { error: categoryIdResult.error } as const;
  if ('value' in categoryIdResult) payload.categoryId = categoryIdResult.value;

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status as BlogPostStatus)) {
      return { error: 'Invalid post status' } as const;
    }
    payload.status = body.status as BlogPostStatus;
  }

  const publishedAtResult = parseDateInput(body.publishedAt, 'publishedAt');
  if ('error' in publishedAtResult) return { error: publishedAtResult.error } as const;
  if ('value' in publishedAtResult) payload.publishedAt = publishedAtResult.value;

  const tagIdsResult = normalizeTagIds(body.tagIds);
  if ('error' in tagIdsResult) return { error: tagIdsResult.error } as const;
  if ('value' in tagIdsResult) tagIds = tagIdsResult.value;

  const nextStatus = payload.status ?? existing.status;
  if (nextStatus === 'PUBLISHED') {
    if (hasPublishedAtInput) {
      payload.publishedAt = payload.publishedAt ?? existing.publishedAt ?? new Date();
    } else if (!existing.publishedAt) {
      payload.publishedAt = new Date();
    }
  } else {
    if (hasStatusInput) {
      payload.publishedAt = null;
    }
  }

  if (hasPublishedAtInput && payload.publishedAt && nextStatus !== 'PUBLISHED') {
    return { error: 'publishedAt is only allowed for published posts' } as const;
  }

  return { payload, tagIds } as const;
}

export async function handleAdminBlogPostGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: AdminBlogPostByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const post = await deps.findPostDetailById(id);
  if (!post) {
    return { status: 404, body: { success: false, error: 'Post not found' } };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { ...post, tags: post.tags.map((t) => t.tag) },
    },
  };
}

export async function handleAdminBlogPostPutRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogPostByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;

  const existing = await deps.findPostById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Post not found' } };
  }

  const parsed = parseUpdatePayload(await request.json(), existing);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  if (parsed.payload.slug && parsed.payload.slug !== existing.slug) {
    const slugExists = await deps.findPostBySlug(parsed.payload.slug);
    if (slugExists) {
      return { status: 400, body: { success: false, error: 'Slug already exists' } };
    }
  }

  if (parsed.payload.categoryId) {
    const category = await deps.findCategoryById(parsed.payload.categoryId);
    if (!category) {
      return { status: 400, body: { success: false, error: 'Category not found' } };
    }
  }

  const requestedTagIds = parsed.tagIds;
  if (requestedTagIds) {
    if (requestedTagIds.length > 0) {
      const tags = await deps.findTagsByIds(requestedTagIds);
      if (tags.length !== requestedTagIds.length) {
        return {
          status: 400,
          body: { success: false, error: 'One or more tags do not exist' },
        };
      }
    }
  }

  const post = await deps.updatePostWithTagsById({
    id,
    payload: parsed.payload,
    tagIds: requestedTagIds,
  });

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'PUT';
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'blog_post',
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Updated blog post ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/posts/[id]',
      ),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { ...post, tags: post.tags.map((t) => t.tag) },
    },
  };
}

export async function handleAdminBlogPostDeleteRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogPostByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findPostById(id);

  if (!existing) {
    return { status: 404, body: { success: false, error: 'Post not found' } };
  }

  await deps.deletePostById(id);

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'DELETE';
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'blog_post',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Deleted blog post ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/posts/[id]',
      ),
    });
  }
  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Blog post deleted successfully' },
    },
  };
}

// GET /api/admin/blog/posts/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogPostGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin get blog post error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PUT /api/admin/blog/posts/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogPostPutRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin update blog post error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// DELETE /api/admin/blog/posts/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogPostDeleteRequest(_request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin delete blog post error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
