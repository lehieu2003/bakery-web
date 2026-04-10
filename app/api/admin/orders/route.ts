import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, OrderStatus, UserRole } from '@prisma/client';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

type AdminUser = {
  id: string;
  role: UserRole;
};

type OrderListQuery = {
  page: number;
  limit: number;
  search: string;
  status: OrderStatus | null;
};

type OrderListDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findOrders: (args: {
    where: Prisma.OrderWhereInput;
    skip: number;
    take: number;
  }) => Promise<unknown[]>;
  countOrders: (where: Prisma.OrderWhereInput) => Promise<number>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: OrderListDeps = {
  requireAdmin,
  findOrders: ({ where, skip, take }) =>
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, phone: true, name: true },
        },
        payment: true,
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  select: { url: true, isPrimary: true },
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  countOrders: (where) => prisma.order.count({ where }),
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

function parseOrderListQuery(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);
  const page = normalizePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
  const limit = normalizePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const search = (searchParams.get('search') ?? '').trim();
  const statusRaw = (searchParams.get('status') ?? '').trim();

  if (!statusRaw) {
    return { page, limit, search, status: null } satisfies OrderListQuery;
  }

  if (!ORDER_STATUSES.includes(statusRaw as OrderStatus)) {
    return { error: 'Invalid status filter' } as const;
  }

  return {
    page,
    limit,
    search,
    status: statusRaw as OrderStatus,
  } satisfies OrderListQuery;
}

export async function handleAdminOrdersGetRequest(
  requestUrl: string,
  deps: OrderListDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const parsed = parseOrderListQuery(requestUrl);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  const where: Prisma.OrderWhereInput = {};
  if (parsed.status) {
    where.status = parsed.status;
  }
  if (parsed.search) {
    where.OR = [
      { orderNumber: { contains: parsed.search, mode: 'insensitive' } },
      { customerName: { contains: parsed.search, mode: 'insensitive' } },
      { customerPhone: { contains: parsed.search, mode: 'insensitive' } },
    ];
  }

  const skip = (parsed.page - 1) * parsed.limit;
  const [orders, total] = await Promise.all([
    deps.findOrders({ where, skip, take: parsed.limit }),
    deps.countOrders(where),
  ]);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        orders,
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

// GET /api/admin/orders - List all orders
export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminOrdersGetRequest(request.url);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin orders error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
