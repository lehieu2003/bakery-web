import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/blog/tags/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const tag = await prisma.blogTag.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tag' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Admin blog tag detail error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/admin/blog/tags/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name, slug } = body;

    if (slug) {
      const existing = await prisma.blogTag.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Slug đã tồn tại' },
          { status: 400 },
        );
      }
    }

    const tag = await prisma.blogTag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Admin update blog tag error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/admin/blog/tags/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Delete tag relations first, then the tag
    await prisma.blogPostTag.deleteMany({ where: { tagId: id } });
    await prisma.blogTag.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Đã xoá tag' },
    });
  } catch (error) {
    console.error('Admin delete blog tag error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
