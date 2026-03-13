/**
 * Product Hooks
 * React Query hooks for products and categories
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  related: (idOrSlug: string) => [...productKeys.all, 'related', idOrSlug] as const,
  categories: () => ['categories'] as const,
  bestSellers: (limit?: number) => [...productKeys.all, 'best-sellers', limit] as const,
};

/**
 * Hook to get products with optional filters
 */
export function useProducts(
  params?: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to get product detail by ID or slug
 */
export function useProductDetail(idOrSlug: string) {
  return useQuery({
    queryKey: productKeys.detail(idOrSlug),
    queryFn: () => productService.getProductDetail(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get related products for a given product
 */
export function useRelatedProducts(idOrSlug: string) {
  return useQuery({
    queryKey: productKeys.related(idOrSlug),
    queryFn: () => productService.getRelatedProducts(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get best-selling products
 */
export function useBestSellers(limit = 10) {
  return useQuery({
    queryKey: productKeys.bestSellers(limit),
    queryFn: () => productService.getBestSellers(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all categories
 */
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => productService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
