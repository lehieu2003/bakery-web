import assert from 'node:assert/strict';
import test from 'node:test';

import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { dashboardService } from '@/services/admin/dashboard.service';

test('dashboardService.getStats appends windowDays query param', async () => {
  const originalGet = http.get;
  let capturedUrl = '';

  (http as { get: typeof http.get }).get = async (url) => {
    capturedUrl = url;
    return {
      success: true,
      data: {
        kpi: {
          todayOrders: 0,
          todayRevenue: 0,
          pendingOrders: 0,
          totalCustomers: 0,
          totalProducts: 0,
          periodOrders: 0,
          periodCompletedOrders: 0,
          periodCancelledOrders: 0,
          conversionRate: 0,
        },
        chartData: [],
        orderStates: [],
        recentOrders: [],
        meta: {
          windowDays: 14,
          generatedAt: '2026-04-14T00:00:00.000Z',
          refreshIntervalSeconds: 300,
          businessTimezone: 'Asia/Ho_Chi_Minh',
          queryDurationMs: 10,
          metricDefinitions: {
            todayRevenue: 'Sum of completed-order totals in current business day',
            conversionRate:
              'Completed orders / total orders in current window, expressed as percentage',
          },
        },
      } as never,
    };
  };

  try {
    const data = await dashboardService.getStats(14);
    assert.equal(
      capturedUrl,
      `${ENDPOINTS.ADMIN.DASHBOARD}?windowDays=14`,
    );
    assert.equal(data.meta.windowDays, 14);
    assert.equal(data.meta.businessTimezone, 'Asia/Ho_Chi_Minh');
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});
