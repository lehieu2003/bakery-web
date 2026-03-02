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
  getStats: async () => {
    const response = await http.get<DashboardStats>(ENDPOINTS.ADMIN.DASHBOARD);
    return response.data!;
  },
};

export default dashboardService;
