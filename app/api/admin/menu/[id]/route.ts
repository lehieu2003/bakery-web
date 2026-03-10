import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

// GET /api/admin/menu/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        page: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: menuItem,
    });
  } catch (error: any) {
    console.error('Get menu item error:', error);
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// PUT /api/admin/menu/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 },
      );
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        title: body.title,
        url: body.url,
        parentId: body.parentId,
        categoryId: body.categoryId,
        pageId: body.pageId,
        type: body.type,
        displayOrder: body.displayOrder,
        isActive: body.isActive,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        page: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: menuItem,
    });
  } catch (error: any) {
    console.error('Update menu item error:', error);
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// DELETE /api/admin/menu/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 },
      );
    }

    await prisma.menuItem.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Menu item deleted successfully' },
    });
  } catch (error: any) {
    console.error('Delete menu item error:', error);
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
