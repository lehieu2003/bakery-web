import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type AdminUser = {
  id: string;
  role: UserRole;
};

type OrderAuditLogRow = {
  id: string;
  orderId: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  mutationType: string;
  beforeData: unknown;
  afterData: unknown;
  metadata: unknown;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    role: UserRole;
  } | null;
};

type OrderAuditDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findLogs: (args: {
    orderId: string;
    skip: number;
    take: number;
  }) => Promise<OrderAuditLogRow[]>;
  countLogs: (orderId: string) => Promise<number>;
};

const defaultDeps: OrderAuditDeps = {
  requireAdmin,
  findLogs: ({ orderId, skip, take }) =>
    prisma.orderAuditLog.findMany({
      where: { orderId },
      include: {
        actor: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
  countLogs: (orderId) =>
    prisma.orderAuditLog.count({
      where: { orderId },
    }),
};

function normalizePage(pageRaw: string | null) {
  const parsed = Number.parseInt(pageRaw ?? '', 10);
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
}

function normalizeLimit(limitRaw: string | null) {
  const parsed = Number.parseInt(limitRaw ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function isMissingAuditTableError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}

export async function handleAdminOrderAuditGetRequest(
  request: Pick<NextRequest, 'url'>,
  params: Promise<{ id: string }>,
  deps: OrderAuditDeps = defaultDeps,
) {
  await deps.requireAdmin();
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const page = normalizePage(searchParams.get('page'));
  const limit = normalizeLimit(searchParams.get('limit'));
  const skip = (page - 1) * limit;

  let logs: OrderAuditLogRow[] = [];
  let total = 0;
  try {
    [logs, total] = await Promise.all([
      deps.findLogs({ orderId: id, skip, take: limit }),
      deps.countLogs(id),
    ]);
  } catch (error: unknown) {
    if (!isMissingAuditTableError(error)) {
      throw error;
    }
    console.warn('Order audit table is missing; returning empty audit list.');
  }

  return {
    status: 200,
    body: {
      success: true as const,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    },
  };
}

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

// GET /api/admin/orders/[id]/audit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminOrderAuditGetRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin order audit list error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
