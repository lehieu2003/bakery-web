import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/slug';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type AdminUser = {
  id: string;
  role: UserRole;
};

type CategoryNode = {
  id: string;
  parentId: string | null;
  level: number;
};

type UpdateCategoryPayload = {
  name?: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  showInMenu?: boolean;
};

type CategoryDetailDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCategoryById: (id: string) => Promise<unknown | null>;
  findCategoryNodeById: (id: string) => Promise<CategoryNode | null>;
  findCategoryBySlug: (slug: string, excludeId: string) => Promise<{ id: string } | null>;
  findChildrenByParentIds: (parentIds: string[]) => Promise<CategoryNode[]>;
  updateCategory: (
    id: string,
    data: Prisma.CategoryUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => Promise<unknown>;
  updateCategoryLevel: (
    id: string,
    level: number,
    tx?: Prisma.TransactionClient,
  ) => Promise<void>;
  countCategoryProducts: (id: string) => Promise<number>;
  countCategoryChildren: (id: string) => Promise<number>;
  deleteCategory: (id: string) => Promise<void>;
  withTransaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
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
    message?: string;
  };
};

const categoryInclude: Prisma.CategoryInclude = {
  _count: { select: { products: true } },
  children: {
    include: {
      _count: { select: { products: true } },
      children: {
        include: { _count: { select: { products: true } } },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  },
};

const defaultDeps: CategoryDetailDeps = {
  requireAdmin,
  findCategoryById: (id) =>
    prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    }),
  findCategoryNodeById: (id) =>
    prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true, level: true },
    }),
  findCategoryBySlug: (slug, excludeId) =>
    prisma.category.findFirst({
      where: { slug, id: { not: excludeId } },
      select: { id: true },
    }),
  findChildrenByParentIds: (parentIds) =>
    prisma.category.findMany({
      where: {
        parentId: { in: parentIds },
      },
      select: {
        id: true,
        parentId: true,
        level: true,
      },
    }),
  updateCategory: (id, data, tx) =>
    (tx ?? prisma).category.update({
      where: { id },
      data,
      include: categoryInclude,
    }),
  updateCategoryLevel: async (id, level, tx) => {
    await (tx ?? prisma).category.update({
      where: { id },
      data: { level },
      select: { id: true },
    });
  },
  countCategoryProducts: (id) =>
    prisma.productCategory.count({
      where: { categoryId: id },
    }),
  countCategoryChildren: (id) =>
    prisma.category.count({
      where: { parentId: id },
    }),
  deleteCategory: async (id) => {
    await prisma.category.delete({ where: { id } });
  },
  withTransaction: (fn) => prisma.$transaction((tx) => fn(tx)),
  writeAdminAudit: writeAdminActionAuditLog,
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function parseUpdatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }

  const body = raw as Record<string, unknown>;
  const payload: UpdateCategoryPayload = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return { error: 'name must be a non-empty string' } as const;
    }
    payload.name = body.name.trim();
  }

  if (body.slug !== undefined || body.name !== undefined) {
    const source =
      typeof body.slug === 'string' && body.slug.trim()
        ? body.slug
        : typeof body.name === 'string'
          ? body.name
          : '';

    const normalized = slugify(source || '');
    if (!normalized) {
      return { error: 'slug must be a non-empty string' } as const;
    }
    payload.slug = normalized;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      return { error: 'description must be a string or null' } as const;
    }
    payload.description =
      typeof body.description === 'string' ? body.description.trim() || null : null;
  }

  if (body.imageUrl !== undefined) {
    if (body.imageUrl !== null && typeof body.imageUrl !== 'string') {
      return { error: 'imageUrl must be a string or null' } as const;
    }
    payload.imageUrl =
      typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : null;
  }

  if (body.parentId !== undefined) {
    if (body.parentId === null) {
      payload.parentId = null;
    } else if (typeof body.parentId === 'string') {
      payload.parentId = body.parentId.trim() || null;
    } else {
      return { error: 'parentId must be a string or null' } as const;
    }
  }

  if (body.displayOrder !== undefined) {
    const displayOrder = Number(body.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return { error: 'displayOrder must be a non-negative integer' } as const;
    }
    payload.displayOrder = displayOrder;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return { error: 'isActive must be a boolean' } as const;
    }
    payload.isActive = body.isActive;
  }

  if (body.showInMenu !== undefined) {
    if (typeof body.showInMenu !== 'boolean') {
      return { error: 'showInMenu must be a boolean' } as const;
    }
    payload.showInMenu = body.showInMenu;
  }

  return { payload } as const;
}

async function collectDescendants(
  rootId: string,
  deps: Pick<CategoryDetailDeps, 'findChildrenByParentIds'>,
) {
  const descendants: Array<{ id: string; depth: number }> = [];
  const visited = new Set<string>([rootId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];

  while (queue.length > 0) {
    const levelIds = queue.map((item) => item.id);
    const children = await deps.findChildrenByParentIds(levelIds);
    if (children.length === 0) break;

    const depthByParent = new Map(queue.map((item) => [item.id, item.depth]));
    queue.length = 0;

    for (const child of children) {
      if (visited.has(child.id)) {
        continue;
      }
      visited.add(child.id);

      const parentDepth = depthByParent.get(child.parentId ?? '') ?? 0;
      const depth = parentDepth + 1;
      descendants.push({ id: child.id, depth });
      queue.push({ id: child.id, depth });
    }
  }

  return descendants;
}

export async function handleAdminCategoryDetailGetRequest(
  params: Promise<{ id: string }>,
  deps: CategoryDetailDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const category = await deps.findCategoryById(id);
  if (!category) {
    return {
      status: 404,
      body: { success: false, error: 'Category not found' },
    };
  }

  return {
    status: 200,
    body: { success: true, data: { category } },
  };
}

export async function handleAdminCategoryUpdateRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: CategoryDetailDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const parsed = parseUpdatePayload(await request.json());

  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const existing = await deps.findCategoryNodeById(id);
  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Category not found' },
    };
  }

  if (parsed.payload.slug && parsed.payload.slug !== undefined) {
    const slugExists = await deps.findCategoryBySlug(parsed.payload.slug, id);
    if (slugExists) {
      return {
        status: 400,
        body: { success: false, error: 'Slug already exists' },
      };
    }
  }

  let nextLevel: number | undefined;
  if (parsed.payload.parentId !== undefined) {
    if (parsed.payload.parentId === id) {
      return {
        status: 400,
        body: { success: false, error: 'A category cannot be its own parent' },
      };
    }

    if (parsed.payload.parentId) {
      const descendants = await collectDescendants(id, deps);
      if (descendants.some((child) => child.id === parsed.payload.parentId)) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Cannot set a descendant category as parent',
          },
        };
      }

      const parent = await deps.findCategoryNodeById(parsed.payload.parentId);
      if (!parent) {
        return {
          status: 400,
          body: { success: false, error: 'Parent category not found' },
        };
      }
      nextLevel = parent.level + 1;
    } else {
      nextLevel = 1;
    }
  }

  await deps.withTransaction(async (tx) => {
    await deps.updateCategory(
      id,
      {
        ...(parsed.payload.name !== undefined ? { name: parsed.payload.name } : {}),
        ...(parsed.payload.slug !== undefined ? { slug: parsed.payload.slug } : {}),
        ...(parsed.payload.description !== undefined
          ? { description: parsed.payload.description }
          : {}),
        ...(parsed.payload.imageUrl !== undefined
          ? { imageUrl: parsed.payload.imageUrl }
          : {}),
        ...(parsed.payload.parentId !== undefined
          ? { parentId: parsed.payload.parentId }
          : {}),
        ...(parsed.payload.displayOrder !== undefined
          ? { displayOrder: parsed.payload.displayOrder }
          : {}),
        ...(parsed.payload.isActive !== undefined
          ? { isActive: parsed.payload.isActive }
          : {}),
        ...(parsed.payload.showInMenu !== undefined
          ? { showInMenu: parsed.payload.showInMenu }
          : {}),
        ...(nextLevel !== undefined ? { level: nextLevel } : {}),
      },
      tx,
    );

    if (nextLevel !== undefined && nextLevel !== existing.level) {
      const descendants = await collectDescendants(id, {
        findChildrenByParentIds: (parentIds) =>
          tx.category.findMany({
            where: { parentId: { in: parentIds } },
            select: { id: true, parentId: true, level: true },
          }),
      });

      await Promise.all(
        descendants.map((node) =>
          deps.updateCategoryLevel(node.id, nextLevel + node.depth, tx),
        ),
      );
    }

  });

  const updatedCategory = await deps.findCategoryById(id);
  if (!updatedCategory) {
    return {
      status: 404,
      body: { success: false, error: 'Category not found' },
    };
  }

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'PUT';
    await deps.writeAdminAudit({
      module: 'catalog',
      entity: 'category',
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Updated category ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/categories/[id]',
      ),
    });
  }

  return {
    status: 200,
    body: { success: true, data: { category: updatedCategory } },
  };
}

export async function handleAdminCategoryDeleteRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: CategoryDetailDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;

  const category = await deps.findCategoryNodeById(id);
  if (!category) {
    return {
      status: 404,
      body: { success: false, error: 'Category not found' },
    };
  }

  const [productCount, childCount] = await Promise.all([
    deps.countCategoryProducts(id),
    deps.countCategoryChildren(id),
  ]);

  if (productCount > 0) {
    return {
      status: 400,
      body: {
        success: false,
        error: `Cannot delete category with ${productCount} products`,
      },
    };
  }

  if (childCount > 0) {
    return {
      status: 400,
      body: {
        success: false,
        error: `Cannot delete category with ${childCount} child categories`,
      },
    };
  }

  await deps.deleteCategory(id);

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'DELETE';
    await deps.writeAdminAudit({
      module: 'catalog',
      entity: 'category',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Deleted category ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/categories/[id]',
      ),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Category deleted successfully' },
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminCategoryDetailGetRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get category error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to fetch category' },
      { status: mapErrorToStatus(message) },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminCategoryUpdateRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Update category error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to update category' },
      { status: mapErrorToStatus(message) },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminCategoryDeleteRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Delete category error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to delete category' },
      { status: mapErrorToStatus(message) },
    );
  }
}
