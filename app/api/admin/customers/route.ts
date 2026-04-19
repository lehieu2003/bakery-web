import { NextRequest, NextResponse } from 'next/server';
import type { MemberLevel, Prisma, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const MEMBER_LEVELS: MemberLevel[] = ['SILVER', 'GOLD', 'PLATINUM'];

type AdminUser = {
  id: string;
  role: UserRole;
};

type CustomerListRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  memberLevel: MemberLevel;
  points: number;
  isActive: boolean;
  createdAt: Date;
  _count: {
    orders: number;
  };
};

type CustomerListQuery = {
  page: number;
  limit: number;
  search: string;
  level: MemberLevel | null;
};

type CustomerListDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCustomers: (args: {
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
  }) => Promise<CustomerListRow[]>;
  countCustomers: (where: Prisma.UserWhereInput) => Promise<number>;
  sumTotalSpentByUserIds: (userIds: string[]) => Promise<Record<string, number>>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: CustomerListDeps = {
  requireAdmin,
  findCustomers: ({ where, skip, take }) =>
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        memberLevel: true,
        points: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
    }),
  countCustomers: (where) => prisma.user.count({ where }),
  sumTotalSpentByUserIds: async (userIds) => {
    if (userIds.length === 0) return {};

    const rows = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    });

    const totals: Record<string, number> = {};
    for (const row of rows) {
      if (!row.userId) continue;
      totals[row.userId] = Number(row._sum.total ?? 0);
    }
    return totals;
  },
};


function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

function parseCustomerListQuery(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);
  const page = normalizePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
  const limit = normalizePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const search = (searchParams.get('search') ?? '').trim();
  const levelRaw = (searchParams.get('level') ?? '').trim();

  if (!levelRaw || levelRaw === 'ALL') {
    return { page, limit, search, level: null } satisfies CustomerListQuery;
  }

  if (!MEMBER_LEVELS.includes(levelRaw as MemberLevel)) {
    return { error: 'Invalid member level filter' } as const;
  }

  return {
    page,
    limit,
    search,
    level: levelRaw as MemberLevel,
  } satisfies CustomerListQuery;
}

function toCustomerListItem(row: CustomerListRow, totalSpent: number) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    memberLevel: row.memberLevel,
    level: row.memberLevel,
    points: row.points,
    isActive: row.isActive,
    createdAt: row.createdAt,
    totalOrders: row._count.orders,
    totalSpent,
  };
}

export async function handleAdminCustomersGetRequest(
  requestUrl: string,
  deps: CustomerListDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const parsed = parseCustomerListQuery(requestUrl);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  const where: Prisma.UserWhereInput = {
    role: 'CUSTOMER',
  };

  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: 'insensitive' } },
      { email: { contains: parsed.search, mode: 'insensitive' } },
      { phone: { contains: parsed.search } },
    ];
  }

  if (parsed.level) {
    where.memberLevel = parsed.level;
  }

  const skip = (parsed.page - 1) * parsed.limit;
  const [rows, total] = await Promise.all([
    deps.findCustomers({ where, skip, take: parsed.limit }),
    deps.countCustomers(where),
  ]);

  const totalsByUserId = await deps.sumTotalSpentByUserIds(rows.map((row) => row.id));
  const customers = rows.map((row) => toCustomerListItem(row, totalsByUserId[row.id] ?? 0));

  return {
    status: 200,
    body: {
      success: true,
      data: {
        customers,
        pagination: {
          page: parsed.page,
          limit: parsed.limit,
          total,
          totalPages: Math.ceil(total / parsed.limit),
        },
      },
    },
  };
}

// GET /api/admin/customers
export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminCustomersGetRequest(request.url);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Get customers error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


