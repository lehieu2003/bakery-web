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

type ProductAuditRow = {
  id: string;
  productRefId: string;
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

type ProductAuditListDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findLogs: (args: {
    productRefId: string;
    skip: number;
    take: number;
  }) => Promise<ProductAuditRow[]>;
  countLogs: (productRefId: string) => Promise<number>;
};

const defaultDeps: ProductAuditListDeps = {
  requireAdmin,
  findLogs: ({ productRefId, skip, take }) =>
    prisma.productAuditLog.findMany({
      where: { productRefId },
      include: {
        actor: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
  countLogs: (productRefId) =>
    prisma.productAuditLog.count({
      where: { productRefId },
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

export async function handleAdminProductAuditGetRequest(
  request: Pick<NextRequest, 'url'>,
  params: Promise<{ id: string }>,
  deps: ProductAuditListDeps = defaultDeps,
) {
  await deps.requireAdmin();
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const page = normalizePage(searchParams.get('page'));
  const limit = normalizeLimit(searchParams.get('limit'));
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    deps.findLogs({ productRefId: id, skip, take: limit }),
    deps.countLogs(id),
  ]);

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

// GET /api/admin/products/[id]/audit - Product mutation audit trail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminProductAuditGetRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin product audit list error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
