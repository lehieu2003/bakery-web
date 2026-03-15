import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
}

function getErrorStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

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
  } catch (error: unknown) {
    console.error('Get menu item error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
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
    const body = (await request.json()) as Record<string, unknown>;

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
        title:
          typeof body.title === 'string' && body.title.trim()
            ? body.title
            : existing.title,
        url: typeof body.url === 'string' ? body.url : null,
        parentId: typeof body.parentId === 'string' ? body.parentId : null,
        categoryId:
          typeof body.categoryId === 'string' ? body.categoryId : null,
        pageId: typeof body.pageId === 'string' ? body.pageId : null,
        type:
          typeof body.type === 'string'
            ? (body.type as 'LINK' | 'CATEGORY' | 'PAGE')
            : existing.type,
        displayOrder:
          typeof body.displayOrder === 'number'
            ? body.displayOrder
            : existing.displayOrder,
        isActive:
          typeof body.isActive === 'boolean' ? body.isActive : existing.isActive,
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
  } catch (error: unknown) {
    console.error('Update menu item error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
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
  } catch (error: unknown) {
    console.error('Delete menu item error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
