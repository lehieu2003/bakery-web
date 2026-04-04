import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

function buildPublicBlogWhere(search: string, categorySlug: string, tagSlug: string) {
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (tagSlug) {
    where.tags = {
      some: { tag: { slug: tagSlug } },
    };
  }

  return where;
}

type BlogPostWithRelations = {
  tags: Array<{ tag: unknown }>;
  [key: string]: unknown;
};

type PublicBlogPostsDeps = {
  findPosts: (args: {
    where: Record<string, unknown>;
    page: number;
    limit: number;
  }) => Promise<BlogPostWithRelations[]>;
  countPosts: (where: Record<string, unknown>) => Promise<number>;
};

const defaultDeps: PublicBlogPostsDeps = {
  findPosts: ({ where, page, limit }) =>
    prisma.blogPost.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  countPosts: (where) => prisma.blogPost.count({ where }),
};

export async function handleGetPublicBlogPostsRequest(
  requestUrl: string,
  deps: PublicBlogPostsDeps = defaultDeps,
) {
  const { searchParams } = new URL(requestUrl);
  const page = normalizePositiveInt(searchParams.get('page'), 1);
  const limit = normalizePositiveInt(searchParams.get('limit'), 10, 50);
  const search = (searchParams.get('search') ?? '').trim();
  const categorySlug = (searchParams.get('categorySlug') ?? '').trim();
  const tagSlug = (searchParams.get('tagSlug') ?? '').trim();

  const where = buildPublicBlogWhere(search, categorySlug, tagSlug);
  const [posts, total] = await Promise.all([
    deps.findPosts({ where, page, limit }),
    deps.countPosts(where),
  ]);

  const flatPosts = posts.map((post) => ({
    ...post,
    tags: post.tags.map((pt) => pt.tag),
  }));

  return {
    status: 200,
    body: {
      success: true as const,
      data: {
        posts: flatPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    },
  };
}

// GET /api/blog/posts - Public published posts with pagination
export async function GET(request: NextRequest) {
  try {
    const result = await handleGetPublicBlogPostsRequest(request.url);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Public blog posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải bài viết' },
      { status: 500 },
    );
  }
}
