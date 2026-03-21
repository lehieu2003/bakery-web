import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';

// GET /api/admin/blog/posts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        tags: { include: { tag: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...post, tags: post.tags.map((t) => t.tag) },
    });
  } catch (error) {
    console.error('Admin get blog post error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/admin/blog/posts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const normalizedSlug =
      body.slug !== undefined ? slugify(body.slug || body.title || '') : undefined;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    // Check slug uniqueness if changed
    if (normalizedSlug && normalizedSlug !== existing.slug) {
      const slugExists = await prisma.blogPost.findUnique({
        where: { slug: normalizedSlug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug đã tồn tại' },
          { status: 400 },
        );
      }
    }

    const { tagIds, ...updateData } = body;
    if (normalizedSlug !== undefined) {
      updateData.slug = normalizedSlug;
    }

    // Handle tags if provided
    if (Array.isArray(tagIds)) {
      await prisma.blogPostTag.deleteMany({ where: { postId: id } });
      if (tagIds.length > 0) {
        await prisma.blogPostTag.createMany({
          data: tagIds.map((tagId: string) => ({ postId: id, tagId })),
        });
      }
    }

    // Auto-set publishedAt when publishing
    if (updateData.status === 'PUBLISHED' && !existing.publishedAt) {
      updateData.publishedAt = new Date().toISOString();
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData,
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
    console.error('Admin update blog post error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/admin/blog/posts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    await prisma.blogPost.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Xóa bài viết thành công' },
    });
  } catch (error) {
    console.error('Admin delete blog post error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
