import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

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
  } catch (error: any) {
    console.error('Admin menu error:', error);
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

// POST /api/admin/menu - Create menu item
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      title,
      url,
      parentId,
      categoryId,
      pageId,
      type,
      displayOrder,
      isActive,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 },
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        title,
        url: url || null,
        parentId: parentId || null,
        categoryId: categoryId || null,
        pageId: pageId || null,
        type: type || 'LINK',
        displayOrder: displayOrder || 0,
        isActive: isActive ?? true,
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
    console.error('Create menu item error:', error);
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
