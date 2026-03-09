/**
 * Banners Hook
 * React Query hook for fetching active banners
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { bannersService } from '@/services/banners.service';

// Query keys
export const bannerKeys = {
  all: ['banners'] as const,
  list: () => [...bannerKeys.all, 'list'] as const,
};

/**
 * Hook to fetch active banners
 */
export function useBanners() {
  return useQuery({
    queryKey: bannerKeys.list(),
    queryFn: () => bannersService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
