/**
 * Admin Coupons Hooks
 * React Query hooks for coupon management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsService } from '@/services/admin/coupons.service';
import type {
  CreateCouponRequest,
  UpdateCouponRequest,
} from '@/services/admin/coupons.service';

// Query keys
export const couponKeys = {
  all: ['admin', 'coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: () => [...couponKeys.lists()] as const,
};

/**
 * Hook to fetch coupons list
 */
export function useCoupons() {
  return useQuery({
    queryKey: couponKeys.list(),
    queryFn: () => couponsService.getAll(),
  });
}

/**
 * Hook to create coupon
 */
export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCouponRequest) => couponsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
  });
}

/**
 * Hook to update coupon (toggle active, change limits)
 */
export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCouponRequest }) =>
      couponsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
  });
}

/**
 * Hook to delete coupon
 */
export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => couponsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
    },
  });
}
