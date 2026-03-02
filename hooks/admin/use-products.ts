/**
 * Admin Products Hooks
 * React Query hooks for products management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/services/admin';
import type {
  ProductsQueryParams,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/api.types';

// Query keys
export const productKeys = {
  all: ['admin', 'products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params?: ProductsQueryParams) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/**
 * Hook to fetch products list
 */
export function useProducts(params?: ProductsQueryParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.getAll(params),
  });
}

/**
 * Hook to fetch single product
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductRequest) => productsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

/**
 * Hook to update product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) =>
      productsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
