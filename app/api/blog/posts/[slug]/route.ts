import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ slug: string }> };

type PublicBlogDetailDeps = {
  findPublishedPostIdBySlug: (slug: string) => Promise<{ id: string } | null>;
  incrementAndFindPublishedPostById: (id: string) => Promise<
    | {
        tags: Array<{ tag: unknown }>;
        [key: string]: unknown;
      }
    | null
  >;
};

const defaultDeps: PublicBlogDetailDeps = {
  findPublishedPostIdBySlug: (slug) =>
    prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    }),
  incrementAndFindPublishedPostById: async (id) => {
    const [incrementResult, post] = await prisma.$transaction([
      prisma.blogPost.updateMany({
        where: { id, status: 'PUBLISHED' },
        data: { viewCount: { increment: 1 } },
      }),
      prisma.blogPost.findFirst({
        where: { id, status: 'PUBLISHED' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true } },
          comments: {
            where: { parentId: null, isApproved: true },
            include: {
              user: { select: { id: true, name: true } },
              replies: {
                where: { isApproved: true },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    if (incrementResult.count === 0) return null;
    return post;
  },
};

export async function handleGetPublicBlogPostBySlugRequest(
  rawSlug: string,
  deps: PublicBlogDetailDeps = defaultDeps,
) {
  const slug = rawSlug.trim();
  if (!slug) {
    return {
      status: 400,
      body: { success: false as const, error: 'Invalid blog post slug' },
    };
  }

  const found = await deps.findPublishedPostIdBySlug(slug);
  if (!found) {
    return {
      status: 404,
      body: { success: false as const, error: 'Không tìm thấy bài viết' },
    };
  }

  const post = await deps.incrementAndFindPublishedPostById(found.id);
  if (!post) {
    return {
      status: 404,
      body: { success: false as const, error: 'Không tìm thấy bài viết' },
    };
  }

  const flatPost = {
    ...post,
    tags: post.tags.map((pt) => pt.tag),
  };

  return {
    status: 200,
    body: { success: true as const, data: flatPost },
  };
}

// GET /api/blog/posts/[slug] - Public post detail + increment viewCount
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const result = await handleGetPublicBlogPostBySlugRequest(slug);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Public blog post detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải bài viết' },
      { status: 500 },
    );
  }
}
