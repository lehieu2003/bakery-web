import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
type ReorderItem = { id: string; displayOrder: number };
type AdminUser = {
  id: string;
  role: UserRole;
};

type BannersReorderDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findBannersByIds: (ids: string[]) => Promise<Array<{ id: string }>>;
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

const defaultDeps: BannersReorderDeps = {
  requireAdmin,
  findBannersByIds: (ids) =>
    prisma.banner.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    }),
  updateDisplayOrders: async (items) => {
    await prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        prisma.banner.update({
          where: { id },
          data: { displayOrder },
        }),
      ),
    );
  },
};


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

    if (typeof row.displayOrder !== 'number') {
      return { error: 'Each item.displayOrder must be a non-negative integer' } as const;
    }
    const displayOrder = row.displayOrder;
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return { error: 'Each item.displayOrder must be a non-negative integer' } as const;
    }

    normalized.push({ id: row.id.trim(), displayOrder });
  }

  const ids = new Set(normalized.map((item) => item.id));
  if (ids.size !== normalized.length) {
    return { error: 'items contains duplicate banner IDs' } as const;
  }

  const orders = new Set(normalized.map((item) => item.displayOrder));
  if (orders.size !== normalized.length) {
    return { error: 'items contains duplicate displayOrder values' } as const;
  }

  return { items: normalized } as const;
}

export async function handleAdminBannerReorderRequest(
  request: NextRequest,
  deps: BannersReorderDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const parsed = parseReorderPayload(await request.json());
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const existing = await deps.findBannersByIds(parsed.items.map((item) => item.id));
  if (existing.length !== parsed.items.length) {
    return {
      status: 400,
      body: { success: false, error: 'One or more banners do not exist' },
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

// PATCH: Bulk reorder banners by updating displayOrder for each
export async function PATCH(request: NextRequest) {
  try {
    const result = await handleAdminBannerReorderRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Reorder banners error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to reorder banners' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}


