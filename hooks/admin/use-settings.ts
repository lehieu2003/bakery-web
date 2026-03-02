/**
 * Admin Settings Hook
 * React Query hook for store settings
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/admin';
import type { UpdateSettingsRequest } from '@/types/api.types';

// Query keys
export const settingsKeys = {
  all: ['admin', 'settings'] as const,
  data: () => [...settingsKeys.all, 'data'] as const,
};

/**
 * Hook to fetch store settings
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.data(),
    queryFn: () => settingsService.get(),
  });
}

/**
 * Hook to update store settings
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSettingsRequest) => settingsService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.data() });
    },
  });
}
