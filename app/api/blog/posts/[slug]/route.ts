import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ slug: string }> };

// GET /api/blog/posts/[slug] - Public post detail + increment viewCount
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const post = await prisma.blogPost.update({
      where: { slug, status: 'PUBLISHED' },
      data: { viewCount: { increment: 1 } },
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
    });

    const flatPost = {
      ...post,
      tags: post.tags.map((pt) => pt.tag),
    };

    return NextResponse.json({ success: true, data: flatPost });
  } catch (error) {
    console.error('Public blog post detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Không tìm thấy bài viết' },
      { status: 404 },
    );
  }
}
