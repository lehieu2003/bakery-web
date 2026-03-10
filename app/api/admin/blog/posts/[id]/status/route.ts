import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/blog/posts/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { status } = await request.json();

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 },
      );
    }

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = { status };
    // Auto-set publishedAt when first publishing
    if (status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...post, tags: post.tags.map((t) => t.tag) },
    });
  } catch (error) {
    console.error('Admin update blog post status error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
