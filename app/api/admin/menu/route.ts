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

// GET /api/admin/menu - List all menu items
export async function GET() {
  try {
    await requireAdmin();

    const menuItems = await prisma.menuItem.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        page: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: menuItems,
    });
  } catch (error: unknown) {
    console.error('Admin menu error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}

// POST /api/admin/menu - Create menu item
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title : '';
    const url = typeof body.url === 'string' ? body.url : null;
    const parentId = typeof body.parentId === 'string' ? body.parentId : null;
    const categoryId =
      typeof body.categoryId === 'string' ? body.categoryId : null;
    const pageId = typeof body.pageId === 'string' ? body.pageId : null;
    const type = typeof body.type === 'string' ? body.type : 'LINK';
    const displayOrder =
      typeof body.displayOrder === 'number' ? body.displayOrder : 0;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 },
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        title,
        url,
        parentId,
        categoryId,
        pageId,
        type: type as 'LINK' | 'CATEGORY' | 'PAGE',
        displayOrder,
        isActive,
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
    console.error('Create menu item error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
