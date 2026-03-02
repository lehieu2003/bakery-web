/**
 * Admin Orders Hooks
 * React Query hooks for orders management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/services/admin';
import type {
  OrdersQueryParams,
  UpdateOrderRequest,
  OrderStatus,
} from '@/types/api.types';

// Query keys
export const orderKeys = {
  all: ['admin', 'orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrdersQueryParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * Hook to fetch orders list
 */
export function useOrders(params?: OrdersQueryParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersService.getAll(params),
  });
}

/**
 * Hook to fetch single order
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to update order
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderRequest }) =>
      ordersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}
