import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminDashboardGetRequest } from '@/app/api/admin/dashboard/route';

function makeDashboardRequest(url: string) {
  return {
    nextUrl: new URL(url),
  } as never;
}

const baseDeps = {
  requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' as const }),
  now: () => new Date('2026-04-14T08:00:00.000Z'),
  countPendingOrders: async () => 0,
  countTotalCustomers: async () => 0,
  countTotalProducts: async () => 0,
  findWindowStatusBuckets: async () => [],
  findRecentOrders: async () => [],
};

test('admin dashboard GET rejects non-integer windowDays', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard?windowDays=abc'),
    baseDeps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'windowDays must be an integer');
});

test('admin dashboard GET rejects unsupported windowDays', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard?windowDays=10'),
    baseDeps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /windowDays must be one of/);
});

test('admin dashboard GET enforces 401 for unauthenticated access', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard'),
    {
      ...baseDeps,
      requireAdmin: async () => {
        throw new Error('Unauthorized');
      },
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('admin dashboard GET enforces 403 for non-admin access', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard'),
    {
      ...baseDeps,
      requireAdmin: async () => {
        throw new Error('Forbidden: Admin access required');
      },
    },
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Forbidden: Admin access required');
});

test('admin dashboard GET returns deterministic KPI, chart, and order state data', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard?windowDays=7'),
    {
      ...baseDeps,
      countPendingOrders: async () => 2,
      countTotalCustomers: async () => 100,
      countTotalProducts: async () => 42,
      findWindowStatusBuckets: async () => [
        {
          dayKey: '2026-04-10',
          status: 'COMPLETED',
          orders: 1,
          completedRevenue: 100000,
        },
        {
          dayKey: '2026-04-10',
          status: 'CANCELLED',
          orders: 1,
          completedRevenue: 0,
        },
        {
          dayKey: '2026-04-14',
          status: 'PENDING',
          orders: 1,
          completedRevenue: 0,
        },
      ],
      findRecentOrders: async () => [
        {
          id: 'o1',
          orderNumber: 'BK001',
          customerName: null,
          total: 230000,
          status: 'PENDING',
          createdAt: new Date('2026-04-14T07:00:00.000Z'),
          itemsCount: 2,
          userName: 'Alice',
        },
      ],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    kpi: {
      periodOrders: number;
      periodCompletedOrders: number;
      periodCancelledOrders: number;
      conversionRate: number;
    };
    chartData: Array<{ day: string; orders: number; revenue: number }>;
    orderStates: Array<{ status: string; count: number }>;
    recentOrders: Array<{ customerName: string; createdAt: string }>;
    meta: {
      windowDays: number;
      refreshIntervalSeconds: number;
      businessTimezone: string;
      queryDurationMs: number;
    };
  };

  assert.equal(data.kpi.periodOrders, 3);
  assert.equal(data.kpi.periodCompletedOrders, 1);
  assert.equal(data.kpi.periodCancelledOrders, 1);
  assert.equal(data.kpi.conversionRate, 33.33);
  assert.equal(data.chartData.length, 7);
  assert.equal(
    data.orderStates.find((item) => item.status === 'PENDING')?.count,
    1,
  );
  assert.equal(
    data.orderStates.find((item) => item.status === 'COMPLETED')?.count,
    1,
  );
  assert.equal(data.recentOrders[0]?.customerName, 'Alice');
  assert.match(
    data.recentOrders[0]?.createdAt ?? '',
    /^2026-04-14T07:00:00.000Z$/,
  );
  assert.equal(data.meta.windowDays, 7);
  assert.equal(data.meta.refreshIntervalSeconds, 300);
  assert.equal(data.meta.businessTimezone, 'Asia/Ho_Chi_Minh');
  assert.equal(typeof data.meta.queryDurationMs, 'number');
});

test('admin dashboard GET handles empty datasets with zeroed metrics', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard'),
    baseDeps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    kpi: { conversionRate: number; periodOrders: number };
    orderStates: Array<{ status: string; count: number }>;
  };
  assert.equal(data.kpi.periodOrders, 0);
  assert.equal(data.kpi.conversionRate, 0);
  assert.equal(
    data.orderStates.every((item) => item.count === 0),
    true,
  );
});

test('admin dashboard GET handles all-cancelled window with zero conversion', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard?windowDays=7'),
    {
      ...baseDeps,
      findWindowStatusBuckets: async () => [
        {
          dayKey: '2026-04-12',
          status: 'CANCELLED',
          orders: 4,
          completedRevenue: 0,
        },
      ],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    kpi: {
      periodOrders: number;
      periodCompletedOrders: number;
      periodCancelledOrders: number;
      conversionRate: number;
    };
  };

  assert.equal(data.kpi.periodOrders, 4);
  assert.equal(data.kpi.periodCompletedOrders, 0);
  assert.equal(data.kpi.periodCancelledOrders, 4);
  assert.equal(data.kpi.conversionRate, 0);
});

test('admin dashboard GET uses business-day labels at timezone boundary', async () => {
  const result = await handleAdminDashboardGetRequest(
    makeDashboardRequest('http://localhost/api/admin/dashboard?windowDays=7'),
    {
      ...baseDeps,
      now: () => new Date('2026-04-14T17:30:00.000Z'),
      findWindowStatusBuckets: async () => [
        {
          dayKey: '2026-04-15',
          status: 'COMPLETED',
          orders: 1,
          completedRevenue: 120000,
        },
      ],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    chartData: Array<{ day: string; orders: number }>;
  };

  assert.equal(
    data.chartData.some((item) => item.day === 'Apr 15' && item.orders === 1),
    true,
  );
});
