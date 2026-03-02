/**
 * Admin Banners Hooks
 * React Query hooks for banners management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersService } from '@/services/admin';
import type {
  CreateBannerRequest,
  UpdateBannerRequest,
} from '@/types/api.types';

// Query keys
export const bannerKeys = {
  all: ['admin', 'banners'] as const,
  lists: () => [...bannerKeys.all, 'list'] as const,
  list: () => [...bannerKeys.lists()] as const,
  details: () => [...bannerKeys.all, 'detail'] as const,
  detail: (id: string) => [...bannerKeys.details(), id] as const,
};

/**
 * Hook to fetch banners list
 */
export function useBanners() {
  return useQuery({
    queryKey: bannerKeys.list(),
    queryFn: () => bannersService.getAll(),
  });
}

/**
 * Hook to fetch single banner
 */
export function useBanner(id: string) {
  return useQuery({
    queryKey: bannerKeys.detail(id),
    queryFn: () => bannersService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create banner
 */
export function useCreateBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBannerRequest) => bannersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}

/**
 * Hook to update banner
 */
export function useUpdateBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBannerRequest }) =>
      bannersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bannerKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete banner
 */
export function useDeleteBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bannersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}
