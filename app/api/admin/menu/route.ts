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

type MenuItemRow = {
  id: string;
  parentId: string | null;
};

type MenuCreatePayload = {
  title: string;
  type: MenuTargetType;
  url: string | null;
  parentId: string | null;
  categoryId: string | null;
  pageId: string | null;
  displayOrder: number;
  isActive: boolean;
};

type AdminMenuDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findMenuItems: () => Promise<unknown[]>;
  findMenuItemById: (id: string) => Promise<MenuItemRow | null>;
  findCategoryById: (id: string) => Promise<{ id: string } | null>;
  findPageById: (id: string) => Promise<{ id: string } | null>;
  createMenuItem: (payload: MenuCreatePayload) => Promise<unknown>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const ALLOWED_TYPES = new Set<MenuTargetType>(['LINK', 'CATEGORY', 'PAGE']);

const includeFields = {
  category: { select: { id: true, name: true, slug: true } },
  page: { select: { id: true, title: true, slug: true } },
};

const defaultDeps: AdminMenuDeps = {
  requireAdmin,
  findMenuItems: () =>
    prisma.menuItem.findMany({
      include: includeFields,
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    }),
  findMenuItemById: (id) =>
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
  createMenuItem: (payload) =>
    prisma.menuItem.create({
      data: payload,
      include: includeFields,
    }),
};


function normalizeMenuPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Dữ liệu không hợp lệ' } as const;
  }

  const body = raw as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return { error: 'Cần nhập tiêu đề' } as const;
  }

  const typeRaw = typeof body.type === 'string' ? body.type : 'LINK';
  if (!ALLOWED_TYPES.has(typeRaw as MenuTargetType)) {
    return { error: 'Loại menu không hợp lệ' } as const;
  }
  const type = typeRaw as MenuTargetType;

  const displayOrderRaw = body.displayOrder ?? 0;
  if (typeof displayOrderRaw !== 'number') {
    return { error: 'Thứ tự hiển thị phải là số nguyên không âm' } as const;
  }
  const displayOrder = displayOrderRaw;
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    return { error: 'Thứ tự hiển thị phải là số nguyên không âm' } as const;
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return { error: 'isActive must be a boolean' } as const;
  }

  const parentId =
    typeof body.parentId === 'string' && body.parentId.trim()
      ? body.parentId.trim()
      : null;
  const url =
    typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null;
  const categoryId =
    typeof body.categoryId === 'string' && body.categoryId.trim()
      ? body.categoryId.trim()
      : null;
  const pageId =
    typeof body.pageId === 'string' && body.pageId.trim()
      ? body.pageId.trim()
      : null;

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
      url: type === 'LINK' ? url : null,
      categoryId: type === 'CATEGORY' ? categoryId : null,
      pageId: type === 'PAGE' ? pageId : null,
      parentId,
      displayOrder,
      isActive: body.isActive ?? true,
    } satisfies MenuCreatePayload,
  } as const;
}

export async function handleAdminMenuGetRequest(
  deps: AdminMenuDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const menuItems = await deps.findMenuItems();

  return {
    status: 200,
    body: {
      success: true,
      data: menuItems,
    },
  };
}

export async function handleAdminMenuPostRequest(
  request: NextRequest,
  deps: AdminMenuDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const parsed = normalizeMenuPayload(await request.json());
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  if (parsed.payload.parentId) {
    const parent = await deps.findMenuItemById(parsed.payload.parentId);
    if (!parent) {
      return {
        status: 400,
        body: { success: false, error: 'Không tìm thấy mục menu cha' },
      };
    }
  }

  if (parsed.payload.categoryId) {
    const category = await deps.findCategoryById(parsed.payload.categoryId);
    if (!category) {
      return {
        status: 400,
        body: { success: false, error: 'Không tìm thấy danh mục' },
      };
    }
  }

  if (parsed.payload.pageId) {
    const page = await deps.findPageById(parsed.payload.pageId);
    if (!page) {
      return {
        status: 400,
        body: { success: false, error: 'Không tìm thấy trang' },
      };
    }
  }

  const menuItem = await deps.createMenuItem(parsed.payload);

  return {
    status: 200,
    body: {
      success: true,
      data: menuItem,
    },
  };
}

// GET /api/admin/menu - List all menu items
export async function GET() {
  try {
    const result = await handleAdminMenuGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin menu error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// POST /api/admin/menu - Create menu item
export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminMenuPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Create menu item error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


