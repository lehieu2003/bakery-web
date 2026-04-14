/**
 * Admin Dashboard Service
 * Dashboard statistics and analytics
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { DashboardStats } from '@/types/api.types';

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  getStats: async (windowDays: 7 | 14 | 30 = 7) => {
    const response = await http.get<DashboardStats>(
      `${ENDPOINTS.ADMIN.DASHBOARD}?windowDays=${windowDays}`,
    );
    return response.data!;
  },
};

export default dashboardService;
