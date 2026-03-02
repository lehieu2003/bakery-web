/**
 * Admin Customers Hooks
 * React Query hooks for customers management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/admin';
import type {
  CustomersQueryParams,
  UpdateCustomerRequest,
} from '@/types/api.types';

// Query keys
export const customerKeys = {
  all: ['admin', 'customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: CustomersQueryParams) =>
    [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

/**
 * Hook to fetch customers list
 */
export function useCustomers(params?: CustomersQueryParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customersService.getAll(params),
  });
}

/**
 * Hook to fetch single customer
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to update customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequest }) =>
      customersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}
