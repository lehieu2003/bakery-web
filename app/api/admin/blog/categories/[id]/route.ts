import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/blog/categories/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const category = await prisma.blogCategory.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy danh mục blog' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Admin blog category detail error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/admin/blog/categories/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name, description, imageUrl, displayOrder, isActive } = body;
    const nextSlug =
      body.slug !== undefined ? slugify(body.slug || body.name || '') : undefined;

    if (nextSlug) {
      const existing = await prisma.blogCategory.findFirst({
        where: { slug: nextSlug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Slug đã tồn tại' },
          { status: 400 },
        );
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nextSlug !== undefined && { slug: nextSlug }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Admin update blog category error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/admin/blog/categories/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const postCount = await prisma.blogPost.count({
      where: { categoryId: id },
    });
    if (postCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể xoá: danh mục đang chứa ${postCount} bài viết`,
        },
        { status: 400 },
      );
    }

    await prisma.blogCategory.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Đã xoá danh mục blog' },
    });
  } catch (error) {
    console.error('Admin delete blog category error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
