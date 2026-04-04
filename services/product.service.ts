/**
 * Product Service
 * Public APIs for products and categories
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Product,
  Category,
  ProductFilterGroup,
  ProductsQueryParams,
} from '@/types/api.types';

export function buildProductQueryParams(params?: ProductsQueryParams) {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.minPrice !== undefined) {
    searchParams.set('minPrice', String(params.minPrice));
  }
  if (params.maxPrice !== undefined) {
    searchParams.set('maxPrice', String(params.maxPrice));
  }
  if (params.inStock !== undefined) {
    searchParams.set('inStock', String(params.inStock));
  }
  for (const filter of params.attributeFilters ?? []) {
    if (!filter.valueSlugs.length) continue;
    searchParams.append(
      'attribute',
      `${filter.attributeSlug}:${filter.valueSlugs.join(',')}`,
    );
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const productService = {
  /**
   * Get all products with optional filters
   */
  getProducts: async (params?: ProductsQueryParams) => {
    const response = await http.get<{
      products: Product[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(
      `${ENDPOINTS.PUBLIC.PRODUCTS}${buildProductQueryParams(params)}`,
      {
        showErrorToast: true,
      },
    );
    return response.data!;
  },

  getProductFilters: async (params?: { categoryId?: string }) => {
    const response = await http.get<{
      filters: ProductFilterGroup[];
      priceRange: { min: number; max: number };
    }>(ENDPOINTS.PUBLIC.PRODUCT_FILTERS, {
      params: params as Record<string, string | number | boolean | undefined>,
      showErrorToast: false,
    });
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
