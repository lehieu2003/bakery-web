import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PublicMenuItem = {
  id: string;
  title: string;
  url: string | null;
  parentId: string | null;
  categoryId: string | null;
  pageId: string | null;
  type: 'CATEGORY' | 'PAGE' | 'LINK';
  displayOrder: number;
  isActive: boolean;
  category: { id: string; name: string; slug: string; isActive: boolean } | null;
  page: { id: string; title: string; slug: string; isPublished: boolean } | null;
};

type PublicMenuNode = PublicMenuItem & { children: PublicMenuNode[] };

type PublicMenuDeps = {
  findActiveMenuItems: () => Promise<PublicMenuItem[]>;
};

const defaultDeps: PublicMenuDeps = {
  findActiveMenuItems: () =>
    prisma.menuItem.findMany({
      where: { isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true, isActive: true } },
        page: { select: { id: true, title: true, slug: true, isPublished: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    }),
};

function canExposeMenuItem(item: PublicMenuItem) {
  if (!item.isActive) return false;
  if (item.type === 'CATEGORY') {
    return Boolean(item.category && item.category.isActive);
  }
  if (item.type === 'PAGE') {
    return Boolean(item.page && item.page.isPublished);
  }
  return true;
}

function buildMenuTree(items: PublicMenuItem[]): PublicMenuNode[] {
  const filtered = items.filter(canExposeMenuItem);
  const map = new Map<string, PublicMenuNode>();
  const roots: PublicMenuNode[] = [];

  for (const item of filtered) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of filtered) {
    const node = map.get(item.id)!;
    if (item.parentId) {
      if (map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node);
      }
      // If parent is missing (filtered out or invalid), drop this node
      // to preserve a valid visible ancestor chain in public navigation.
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function handleGetPublicMenuRequest(
  deps: PublicMenuDeps = defaultDeps,
) {
  const menuItems = await deps.findActiveMenuItems();
  return {
    status: 200,
    body: {
      success: true as const,
      data: buildMenuTree(menuItems),
    },
  };
}

// GET /api/public/menu - Get active menu items as tree
export async function GET() {
  try {
    const result = await handleGetPublicMenuRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get public menu error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu' },
      { status: 500 },
    );
  }
}
