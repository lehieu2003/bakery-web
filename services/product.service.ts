/**
 * Product Service
 * Public APIs for products and categories
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Product, Category } from '@/types/api.types';

export const productService = {
  /**
   * Get all products with optional filters
   */
  getProducts: async (params?: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await http.get<{
      products: Product[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(
      ENDPOINTS.PUBLIC.PRODUCTS,
      {
        params,
        showErrorToast: true,
      },
    );
    return response.data!;
  },

  /**
   * Get product by ID or slug
   */
  getProductDetail: async (idOrSlug: string) => {
    const response = await http.get<{ product: Product }>(
      ENDPOINTS.PUBLIC.PRODUCT_DETAIL(idOrSlug),
      {
        showErrorToast: true,
      },
    );
    return response.data!.product;
  },

  /**
   * Get best-selling products ranked by quantity sold
   */
  getBestSellers: async (limit = 10) => {
    const response = await http.get<{ products: (Product & { totalSold: number })[] }>(
      ENDPOINTS.PUBLIC.BEST_SELLERS,
      { params: { limit }, showErrorToast: false },
    );
    return response.data!.products;
  },

  /**
   * Get related products for a given product (by id or slug)
   */
  getRelatedProducts: async (idOrSlug: string) => {
    const response = await http.get<Product[]>(
      ENDPOINTS.PUBLIC.RELATED_PRODUCTS(idOrSlug),
      { showErrorToast: false },
    );
    return response.data ?? [];
  },

  /**
   * Get all categories
   */
  getCategories: async () => {
    const response = await http.get<{ categories: Category[] }>(
      ENDPOINTS.PUBLIC.CATEGORIES,
      {
        showErrorToast: true,
      },
    );
    return response.data!.categories;
  },
};
