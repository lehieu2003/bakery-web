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
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardService.getStats(),
    // Refetch every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
