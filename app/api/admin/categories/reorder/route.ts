import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

type AdminUser = {
  id: string;
  role: UserRole;
};

type ReorderItem = { id: string; displayOrder: number };

type CategoryReorderDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCategoriesByIds: (ids: string[]) => Promise<Array<{ id: string; parentId: string | null }>>;
  updateDisplayOrders: (items: ReorderItem[]) => Promise<void>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: CategoryReorderDeps = {
  requireAdmin,
  findCategoriesByIds: (ids) =>
    prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, parentId: true },
    }),
  updateDisplayOrders: async (items) => {
    await prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        prisma.category.update({
          where: { id },
          data: { displayOrder },
        }),
      ),
    );
  },
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function parseReorderPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }

  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'items array is required' } as const;
  }

  const normalized: ReorderItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { error: 'Each item must be an object' } as const;
    }

    const row = item as { id?: unknown; displayOrder?: unknown };
    if (typeof row.id !== 'string' || !row.id.trim()) {
      return { error: 'Each item.id must be a non-empty string' } as const;
    }

    const displayOrder = Number(row.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return { error: 'Each item.displayOrder must be a non-negative integer' } as const;
    }

    normalized.push({ id: row.id.trim(), displayOrder });
  }

  const uniqueIds = new Set(normalized.map((item) => item.id));
  if (uniqueIds.size !== normalized.length) {
    return { error: 'items contains duplicate category IDs' } as const;
  }

  const uniqueDisplayOrders = new Set(normalized.map((item) => item.displayOrder));
  if (uniqueDisplayOrders.size !== normalized.length) {
    return { error: 'items contains duplicate displayOrder values' } as const;
  }

  return { items: normalized } as const;
}

export async function handleAdminCategoryReorderRequest(
  request: NextRequest,
  deps: CategoryReorderDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const parsed = parseReorderPayload(await request.json());
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const categories = await deps.findCategoriesByIds(parsed.items.map((item) => item.id));
  if (categories.length !== parsed.items.length) {
    return {
      status: 400,
      body: { success: false, error: 'One or more categories do not exist' },
    };
  }

  if (categories.some((category) => category.parentId !== null)) {
    return {
      status: 400,
      body: { success: false, error: 'Only root categories can be reordered' },
    };
  }

  await deps.updateDisplayOrders(parsed.items);

  return {
    status: 200,
    body: {
      success: true,
      data: { updatedCount: parsed.items.length },
    },
  };
}

// PATCH: Bulk reorder categories by updating displayOrder for each
export async function PATCH(request: NextRequest) {
  try {
    const result = await handleAdminCategoryReorderRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Reorder categories error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to reorder categories' },
      { status: mapErrorToStatus(message) },
    );
  }
}
