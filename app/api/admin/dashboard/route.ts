import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
const ALLOWED_WINDOW_DAYS = [7, 14, 30] as const;
const DEFAULT_WINDOW_DAYS = 7;
const DASHBOARD_REFRESH_SECONDS = 300;
const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';
const BUSINESS_UTC_OFFSET_HOURS = 7;
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

type DashboardHandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type DailyBucket = {
  dayKey: string;
  orders: number;
  revenue: number;
  completedOrders: number;
  cancelledOrders: number;
};

type WindowStatusBucket = {
  dayKey: string;
  status: OrderStatus;
  orders: number;
  completedRevenue: number;
};

type DashboardDeps = {
  requireAdmin: () => Promise<AdminUser>;
  now: () => Date;
  countPendingOrders: () => Promise<number>;
  countTotalCustomers: () => Promise<number>;
  countTotalProducts: () => Promise<number>;
  findWindowStatusBuckets: (
    windowStartUtc: Date,
    tomorrowStartUtc: Date,
  ) => Promise<WindowStatusBucket[]>;
  findRecentOrders: () => Promise<
    Array<{
      id: string;
      orderNumber: string;
      customerName: string | null;
      total: number;
      status: OrderStatus;
      createdAt: Date;
      itemsCount: number;
      userName: string | null;
    }>
  >;
};


function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toBusinessLocal(date: Date) {
  return new Date(date.getTime() + BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

function toBusinessDayKey(date: Date) {
  const businessLocal = toBusinessLocal(date);
  return businessLocal.toISOString().slice(0, 10);
}

function businessDayStartUtc(date: Date) {
  const businessLocal = toBusinessLocal(date);
  businessLocal.setUTCHours(0, 0, 0, 0);
  return new Date(businessLocal.getTime() - BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

function parseWindowDays(request: Pick<NextRequest, 'nextUrl'>) {
  const raw = request.nextUrl.searchParams.get('windowDays');
  if (!raw) {
    return { value: DEFAULT_WINDOW_DAYS } as const;
  }

  if (!/^\d+$/.test(raw)) {
    return { error: 'windowDays must be an integer' } as const;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!ALLOWED_WINDOW_DAYS.includes(parsed as (typeof ALLOWED_WINDOW_DAYS)[number])) {
    return {
      error: `windowDays must be one of: ${ALLOWED_WINDOW_DAYS.join(', ')}`,
    } as const;
  }

  return { value: parsed } as const;
}

function buildChartData(dailyBuckets: DailyBucket[], windowStartUtc: Date, windowDays: number) {
  const buckets = new Map<string, DailyBucket>();

  for (let i = 0; i < windowDays; i += 1) {
    const utcDay = addUtcDays(windowStartUtc, i);
    const dayKey = toBusinessDayKey(utcDay);
    buckets.set(dayKey, {
      dayKey,
      orders: 0,
      revenue: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    });
  }

  for (const bucket of dailyBuckets) {
    const existing = buckets.get(bucket.dayKey);
    if (!existing) continue;

    existing.orders = bucket.orders;
    existing.revenue = bucket.revenue;
    existing.completedOrders = bucket.completedOrders;
    existing.cancelledOrders = bucket.cancelledOrders;
  }

  return [...buckets.values()].map((item) => ({
    day: new Date(`${item.dayKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
    }),
    orders: item.orders,
    revenue: round2(item.revenue),
    completedOrders: item.completedOrders,
    cancelledOrders: item.cancelledOrders,
  }));
}

function buildOrderStateStats(windowStatusBuckets: WindowStatusBucket[]) {
  const countMap = new Map<OrderStatus, number>();
  windowStatusBuckets.forEach((item) => {
    countMap.set(item.status, (countMap.get(item.status) ?? 0) + item.orders);
  });

  return ORDER_STATUSES.map((status) => ({
    status,
    count: countMap.get(status) ?? 0,
  }));
}

function buildDailyBucketsFromStatusBuckets(windowStatusBuckets: WindowStatusBucket[]) {
  const dayMap = new Map<string, DailyBucket>();

  for (const item of windowStatusBuckets) {
    const existing = dayMap.get(item.dayKey) ?? {
      dayKey: item.dayKey,
      orders: 0,
      revenue: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };

    existing.orders += item.orders;

    if (item.status === 'COMPLETED') {
      existing.revenue += item.completedRevenue;
      existing.completedOrders += item.orders;
    }

    if (item.status === 'CANCELLED') {
      existing.cancelledOrders += item.orders;
    }

    dayMap.set(item.dayKey, existing);
  }

  return [...dayMap.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

const defaultDeps: DashboardDeps = {
  requireAdmin,
  now: () => new Date(),
  countPendingOrders: () => prisma.order.count({ where: { status: 'PENDING' } }),
  countTotalCustomers: () => prisma.user.count({ where: { role: 'CUSTOMER' } }),
  countTotalProducts: () => prisma.product.count({ where: { isActive: true } }),
  findWindowStatusBuckets: async (windowStartUtc, tomorrowStartUtc) => {
    const rows = await prisma.$queryRaw<
      Array<{
        day_key: string;
        status: OrderStatus;
        orders_count: bigint;
        completed_revenue: unknown;
      }>
    >(Prisma.sql`
      SELECT
        TO_CHAR(("createdAt" AT TIME ZONE ${BUSINESS_TIMEZONE})::date, 'YYYY-MM-DD') AS day_key,
        "status",
        COUNT(*)::bigint AS orders_count,
        COALESCE(SUM(CASE WHEN "status" = 'COMPLETED' THEN "total" ELSE 0 END), 0) AS completed_revenue
      FROM "Order"
      WHERE "createdAt" >= ${windowStartUtc}
        AND "createdAt" < ${tomorrowStartUtc}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `);

    return rows.map((row) => ({
      dayKey: row.day_key,
      status: row.status,
      orders: Number(row.orders_count),
      completedRevenue: Number(row.completed_revenue ?? 0),
    }));
  },
  findRecentOrders: async () => {
    const rows = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      customerName: row.customerName,
      total: Number(row.total),
      status: row.status,
      createdAt: row.createdAt,
      itemsCount: row._count.orderItems,
      userName: row.user?.name ?? null,
    }));
  },
};

export async function handleAdminDashboardGetRequest(
  request: Pick<NextRequest, 'nextUrl'>,
  deps: DashboardDeps = defaultDeps,
): Promise<DashboardHandlerResult> {
  const startTime = Date.now();

  try {
    await deps.requireAdmin();

    const parsedWindowDays = parseWindowDays(request);
    if ('error' in parsedWindowDays) {
      return {
        status: 400,
        body: { success: false, error: parsedWindowDays.error },
      };
    }

    const now = deps.now();
    const todayStartUtc = businessDayStartUtc(now);
    const tomorrowStartUtc = addUtcDays(todayStartUtc, 1);
    const windowDays = parsedWindowDays.value;
    const windowStartUtc = addUtcDays(todayStartUtc, -(windowDays - 1));

    const [
      pendingOrders,
      totalCustomers,
      totalProducts,
      windowStatusBuckets,
      recentOrders,
    ] = await Promise.all([
      deps.countPendingOrders(),
      deps.countTotalCustomers(),
      deps.countTotalProducts(),
      deps.findWindowStatusBuckets(windowStartUtc, tomorrowStartUtc),
      deps.findRecentOrders(),
    ]);

    const dailyBuckets = buildDailyBucketsFromStatusBuckets(windowStatusBuckets);
    const todayDayKey = toBusinessDayKey(now);
    const todayBucket = dailyBuckets.find((item) => item.dayKey === todayDayKey);
    const todayOrders = todayBucket?.orders ?? 0;
    const todayRevenue = round2(todayBucket?.revenue ?? 0);
    const orderStates = buildOrderStateStats(windowStatusBuckets);

    const periodOrders = dailyBuckets.reduce((sum, item) => sum + item.orders, 0);
    const periodCompletedOrders = dailyBuckets.reduce(
      (sum, item) => sum + item.completedOrders,
      0,
    );
    const periodCancelledOrders = dailyBuckets.reduce(
      (sum, item) => sum + item.cancelledOrders,
      0,
    );

    const conversionRate =
      periodOrders > 0 ? round2((periodCompletedOrders / periodOrders) * 100) : 0;

    const queryDurationMs = Date.now() - startTime;

    return {
      status: 200,
      body: {
        success: true,
        data: {
          kpi: {
            todayOrders,
            todayRevenue,
            pendingOrders,
            totalCustomers,
            totalProducts,
            periodOrders,
            periodCompletedOrders,
            periodCancelledOrders,
            conversionRate,
          },
          chartData: buildChartData(dailyBuckets, windowStartUtc, windowDays),
          orderStates,
          recentOrders: recentOrders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName || order.userName || 'Guest',
            total: order.total,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            itemsCount: order.itemsCount,
          })),
          meta: {
            windowDays,
            generatedAt: now.toISOString(),
            refreshIntervalSeconds: DASHBOARD_REFRESH_SECONDS,
            businessTimezone: BUSINESS_TIMEZONE,
            queryDurationMs,
            metricDefinitions: {
              todayRevenue: 'Sum of completed-order totals in current business day',
              conversionRate:
                'Completed orders / total orders in current window, expressed as percentage',
            },
          },
        },
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không tải được dashboard data';
    const status = mapAuthErrorToStatus(message);
    return {
      status,
      body: {
        success: false,
        error: status === 500 ? 'Không tải được dashboard data' : message,
      },
    };
  }
}

export async function GET(request: NextRequest) {
  const result = await handleAdminDashboardGetRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}


