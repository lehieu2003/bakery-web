/**
 * Admin Membership Hook
 * React Query hook for membership configuration
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipService } from '@/services/admin';
import type { UpdateMembershipRequest } from '@/types/api.types';

// Query keys
export const membershipKeys = {
  all: ['admin', 'membership'] as const,
  config: () => [...membershipKeys.all, 'config'] as const,
};

/**
 * Hook to fetch membership configuration
 */
export function useMembership() {
  return useQuery({
    queryKey: membershipKeys.config(),
    queryFn: () => membershipService.get(),
  });
}

/**
 * Hook to update membership configuration
 */
export function useUpdateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMembershipRequest) =>
      membershipService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipKeys.config() });
    },
  });
}
