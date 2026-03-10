import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/menu - Get active menu items as tree
export async function GET() {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: { isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        page: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Build tree from flat list
    const itemMap = new Map<
      string,
      (typeof menuItems)[0] & { children: typeof menuItems }
    >();
    const roots: ((typeof menuItems)[0] & { children: typeof menuItems })[] =
      [];

    for (const item of menuItems) {
      itemMap.set(item.id, { ...item, children: [] });
    }

    for (const item of menuItems) {
      const node = itemMap.get(item.id)!;
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json({
      success: true,
      data: roots,
    });
  } catch (error) {
    console.error('Get public menu error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu' },
      { status: 500 },
    );
  }
}
