/**
 * Admin Dashboard Hook
 * React Query hook for dashboard statistics
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/admin';

// Query keys
export const dashboardKeys = {
  all: ['admin', 'dashboard'] as const,
  stats: (windowDays: 7 | 14 | 30) =>
    [...dashboardKeys.all, 'stats', windowDays] as const,
};

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboard(windowDays: 7 | 14 | 30 = 7) {
  return useQuery({
    queryKey: dashboardKeys.stats(windowDays),
    queryFn: () => dashboardService.getStats(windowDays),
    staleTime: 60 * 1000,
    // Refetch every 5 minutes
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
