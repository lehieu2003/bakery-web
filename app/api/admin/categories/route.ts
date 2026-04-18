import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type AdminUser = {
  id: string;
  role: UserRole;
};

type CategoryPayload = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
  showInMenu: boolean;
};

type CategoriesRouteDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findAllCategories: () => Promise<unknown[]>;
  findCategoryBySlug: (slug: string) => Promise<{ id: string } | null>;
  findCategoryById: (id: string) => Promise<{ id: string; level: number } | null>;
  createCategory: (payload: CategoryPayload & { level: number }) => Promise<unknown>;
  writeAdminAudit?: (payload: {
    module: string;
    entity: string;
    entityId: string;
    mutationType: string;
    summary: string;
    actorUserId?: string | null;
    actorRole?: UserRole | null;
    correlation: {
      requestId: string;
      route: string;
      httpMethod: string;
      orderId?: string | null;
      paymentId?: string | null;
      transactionId?: string | null;
      attempt?: number | null;
    };
  }) => Promise<void>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const categoriesInclude = {
  _count: {
    select: { products: true },
  },
  children: {
    include: {
      _count: { select: { products: true } },
      children: {
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { displayOrder: 'asc' as const },
      },
    },
    orderBy: { displayOrder: 'asc' as const },
  },
};

const defaultDeps: CategoriesRouteDeps = {
  requireAdmin,
  findAllCategories: () =>
    prisma.category.findMany({
      include: categoriesInclude,
      orderBy: { displayOrder: 'asc' },
    }),
  findCategoryBySlug: (slug) =>
    prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    }),
  findCategoryById: (id) =>
    prisma.category.findUnique({
      where: { id },
      select: { id: true, level: true },
    }),
  createCategory: (payload) =>
    prisma.category.create({
      data: payload,
      include: {
        _count: { select: { products: true } },
      },
    }),
  writeAdminAudit: writeAdminActionAuditLog,
};

function normalizeCreatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;

  const body = raw as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slugSource =
    typeof body.slug === 'string' && body.slug.trim()
      ? body.slug
      : name;
  const slug = slugify(slugSource || '');
  const parentId =
    body.parentId === null
      ? null
      : typeof body.parentId === 'string' && body.parentId.trim()
        ? body.parentId.trim()
        : undefined;
  const displayOrder = Number(body.displayOrder ?? 0);
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return { error: 'isActive must be a boolean' } as const;
  }
  if (body.showInMenu !== undefined && typeof body.showInMenu !== 'boolean') {
    return { error: 'showInMenu must be a boolean' } as const;
  }
  const isActive = body.isActive !== undefined ? body.isActive : true;
  const showInMenu = body.showInMenu !== undefined ? body.showInMenu : true;

  if (!name || !slug) {
    return { error: 'Thiếu thông tin bắt buộc' } as const;
  }

  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    return { error: 'displayOrder must be a non-negative integer' } as const;
  }

  return {
    payload: {
      name,
      slug,
      description:
        typeof body.description === 'string' ? body.description.trim() || null : null,
      imageUrl:
        typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : null,
      parentId,
      displayOrder,
      isActive,
      showInMenu,
    },
  } as const;
}

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

export async function handleAdminCategoriesGetRequest(
  deps: CategoriesRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const categories = await deps.findAllCategories();
  const tree = (categories as Array<{ parentId?: string | null }>).filter(
    (category) => category.parentId === null,
  );

  return {
    status: 200,
    body: {
      success: true,
      data: { categories: tree },
    },
  };
}

// POST /api/admin/categories
export async function handleAdminCategoriesPostRequest(
  request: NextRequest,
  deps: CategoriesRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const body = await request.json();
  const parsed = normalizeCreatePayload(body);

  if (!parsed || 'error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed?.error ?? 'Invalid payload' },
    };
  }

  const existingSlug = await deps.findCategoryBySlug(parsed.payload.slug);
  if (existingSlug) {
    return {
      status: 400,
      body: { success: false, error: 'Slug already exists' },
    };
  }

  let parentLevel = 0;
  if (parsed.payload.parentId) {
    const parent = await deps.findCategoryById(parsed.payload.parentId);
    if (!parent) {
      return {
        status: 400,
        body: { success: false, error: 'Parent category not found' },
      };
    }
    parentLevel = parent.level;
  }

  const category = await deps.createCategory({
    ...parsed.payload,
    parentId: parsed.payload.parentId ?? null,
    level: parsed.payload.parentId ? parentLevel + 1 : 1,
  });

  const headers =
    typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
      ? (request as unknown as { headers: Headers }).headers
      : new Headers();
  const method =
    typeof (request as unknown as { method?: string }).method === 'string'
      ? (request as unknown as { method: string }).method
      : 'POST';

  if (deps.writeAdminAudit && typeof category === 'object' && category !== null) {
    const categoryId =
      typeof (category as { id?: unknown }).id === 'string'
        ? (category as { id: string }).id
        : 'unknown';
    await deps.writeAdminAudit({
      module: 'catalog',
      entity: 'category',
      entityId: categoryId,
      mutationType: 'CREATE',
      summary: `Created category ${parsed.payload.name}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation({ headers, method }, '/api/admin/categories'),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { category },
    },
  };
}

export async function GET() {
  try {
    const result = await handleAdminCategoriesGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin categories error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status: mapErrorToStatus(errorMessage) },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminCategoriesPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin create category error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status: mapErrorToStatus(errorMessage) },
    );
  }
}
