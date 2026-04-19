import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
type MenuTargetType = 'LINK' | 'CATEGORY' | 'PAGE';
type AdminUser = {
  id: string;
  role: UserRole;
};

type MenuItemRecord = {
  id: string;
  title: string;
  url: string | null;
  parentId: string | null;
  categoryId: string | null;
  pageId: string | null;
  type: MenuTargetType;
  displayOrder: number;
  isActive: boolean;
};

type AdminMenuByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findMenuItemById: (id: string) => Promise<MenuItemRecord | null>;
  findMenuParentById: (id: string) => Promise<{ id: string; parentId: string | null } | null>;
  findCategoryById: (id: string) => Promise<{ id: string } | null>;
  findPageById: (id: string) => Promise<{ id: string } | null>;
  updateMenuItemById: (
    id: string,
    payload: Partial<MenuItemRecord>,
  ) => Promise<unknown>;
  deleteMenuItemById: (id: string) => Promise<void>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const includeFields = {
  category: { select: { id: true, name: true, slug: true } },
  page: { select: { id: true, title: true, slug: true } },
};

const ALLOWED_TYPES = new Set<MenuTargetType>(['LINK', 'CATEGORY', 'PAGE']);

const defaultDeps: AdminMenuByIdDeps = {
  requireAdmin,
  findMenuItemById: (id) =>
    prisma.menuItem.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        url: true,
        parentId: true,
        categoryId: true,
        pageId: true,
        type: true,
        displayOrder: true,
        isActive: true,
      },
    }),
  findMenuParentById: (id) =>
    prisma.menuItem.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    }),
  findCategoryById: (id) =>
    prisma.category.findUnique({
      where: { id },
      select: { id: true },
    }),
  findPageById: (id) =>
    prisma.page.findUnique({
      where: { id },
      select: { id: true },
    }),
  updateMenuItemById: (id, payload) =>
    prisma.menuItem.update({
      where: { id },
      data: payload,
      include: includeFields,
    }),
  deleteMenuItemById: async (id) => {
    await prisma.menuItem.delete({ where: { id } });
  },
};


function parseMenuUpdatePayload(raw: unknown, existing: MenuItemRecord) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }

  const body = raw as Record<string, unknown>;

  let type: MenuTargetType = existing.type as MenuTargetType;
  if (body.type !== undefined) {
    if (typeof body.type !== 'string' || !ALLOWED_TYPES.has(body.type as MenuTargetType)) {
      return { error: 'Invalid menu type' } as const;
    }
    type = body.type as MenuTargetType;
  }

  let title = existing.title;
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { error: 'title must be a non-empty string' } as const;
    }
    title = body.title.trim();
  }

  let displayOrder = existing.displayOrder;
  if (body.displayOrder !== undefined) {
    if (typeof body.displayOrder !== 'number') {
      return { error: 'displayOrder must be a non-negative integer' } as const;
    }
    const value = body.displayOrder;
    if (!Number.isInteger(value) || value < 0) {
      return { error: 'displayOrder must be a non-negative integer' } as const;
    }
    displayOrder = value;
  }

  let isActive = existing.isActive;
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return { error: 'isActive must be a boolean' } as const;
    }
    isActive = body.isActive;
  }

  const parentId =
    body.parentId !== undefined
      ? typeof body.parentId === 'string' && body.parentId.trim()
        ? body.parentId.trim()
        : null
      : existing.parentId;

  const url =
    body.url !== undefined
      ? typeof body.url === 'string' && body.url.trim()
        ? body.url.trim()
        : null
      : existing.url;

  const categoryId =
    body.categoryId !== undefined
      ? typeof body.categoryId === 'string' && body.categoryId.trim()
        ? body.categoryId.trim()
        : null
      : existing.categoryId;

  const pageId =
    body.pageId !== undefined
      ? typeof body.pageId === 'string' && body.pageId.trim()
        ? body.pageId.trim()
        : null
      : existing.pageId;

  if (type === 'LINK' && !url) {
    return { error: 'url is required for LINK menu type' } as const;
  }
  if (type === 'CATEGORY' && !categoryId) {
    return { error: 'categoryId is required for CATEGORY menu type' } as const;
  }
  if (type === 'PAGE' && !pageId) {
    return { error: 'pageId is required for PAGE menu type' } as const;
  }

  return {
    payload: {
      title,
      type,
      parentId,
      displayOrder,
      isActive,
      url: type === 'LINK' ? url : null,
      categoryId: type === 'CATEGORY' ? categoryId : null,
      pageId: type === 'PAGE' ? pageId : null,
    } satisfies Partial<MenuItemRecord>,
  } as const;
}

async function createsParentCycle(
  itemId: string,
  targetParentId: string | null,
  deps: AdminMenuByIdDeps,
) {
  if (!targetParentId) return false;
  if (targetParentId === itemId) return true;

  let cursor: string | null = targetParentId;
  const visited = new Set<string>();
  while (cursor) {
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    if (cursor === itemId) return true;
    const parent = await deps.findMenuParentById(cursor);
    if (!parent) return false;
    cursor = parent.parentId;
  }
  return false;
}

export async function handleAdminMenuGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: AdminMenuByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    include: includeFields,
  });

  if (!menuItem) {
    return {
      status: 404,
      body: { success: false, error: 'Menu item not found' },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: menuItem,
    },
  };
}

export async function handleAdminMenuUpdateRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminMenuByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findMenuItemById(id);

  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Menu item not found' },
    };
  }

  const parsed = parseMenuUpdatePayload(await request.json(), existing);
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  if (parsed.payload.parentId) {
    const parent = await deps.findMenuParentById(parsed.payload.parentId);
    if (!parent) {
      return {
        status: 400,
        body: { success: false, error: 'Parent menu item not found' },
      };
    }
  }

  if (await createsParentCycle(id, parsed.payload.parentId ?? null, deps)) {
    return {
      status: 400,
      body: { success: false, error: 'Parent relationship creates a cycle' },
    };
  }

  if (parsed.payload.categoryId) {
    const category = await deps.findCategoryById(parsed.payload.categoryId);
    if (!category) {
      return {
        status: 400,
        body: { success: false, error: 'Category not found' },
      };
    }
  }

  if (parsed.payload.pageId) {
    const page = await deps.findPageById(parsed.payload.pageId);
    if (!page) {
      return {
        status: 400,
        body: { success: false, error: 'Page not found' },
      };
    }
  }

  const menuItem = await deps.updateMenuItemById(id, parsed.payload);
  return {
    status: 200,
    body: {
      success: true,
      data: menuItem,
    },
  };
}

export async function handleAdminMenuDeleteRequest(
  params: Promise<{ id: string }>,
  deps: AdminMenuByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findMenuItemById(id);

  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Menu item not found' },
    };
  }

  await deps.deleteMenuItemById(id);
  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Menu item deleted successfully' },
    },
  };
}

// GET /api/admin/menu/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminMenuGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Get menu item error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
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
    const result = await handleAdminMenuUpdateRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Update menu item error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
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
    const result = await handleAdminMenuDeleteRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Delete menu item error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


