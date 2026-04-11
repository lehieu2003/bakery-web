/**
 * Admin Products Service
 * CRUD operations for products management
 */

import http, { type PaginatedResponse } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Product,
  ProductsQueryParams,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/api.types';

type ProductAuditListResponse = {
  logs: Array<{
    id: string;
    mutationType: string;
    actorRole: string | null;
    createdAt: string;
    metadata: unknown;
    actor: {
      id: string;
      name: string | null;
      role: string;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const productsService = {
  /**
   * Get all products with pagination and filters
   */
  getAll: async (params?: ProductsQueryParams) => {
    const response = await http.get<{
      products: Product[];
      pagination: PaginatedResponse<Product>['pagination'];
    }>(ENDPOINTS.ADMIN.PRODUCTS.LIST, {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data!;
  },

  /**
   * Get single product by ID
   */
  getById: async (id: string) => {
    const response = await http.get<{ product: Product }>(
      ENDPOINTS.ADMIN.PRODUCTS.DETAIL(id),
    );
    return response.data!.product;
  },

  /**
   * Create new product
   */
  create: async (data: CreateProductRequest) => {
    const response = await http.post<{ product: Product }>(
      ENDPOINTS.ADMIN.PRODUCTS.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo sản phẩm thành công!',
      },
    );
    return response.data!.product;
  },

  /**
   * Update product
   */
  update: async (id: string, data: UpdateProductRequest) => {
    const response = await http.put<{ product: Product }>(
      ENDPOINTS.ADMIN.PRODUCTS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật sản phẩm thành công!',
      },
    );
    return response.data!.product;
  },

  /**
   * Delete product
   */
  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.PRODUCTS.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa sản phẩm thành công!',
      },
    );
    return response.data!;
  },

  /**
   * Get product audit logs
   */
  getAudit: async (id: string, page = 1, limit = 20) => {
    const response = await http.get<ProductAuditListResponse>(
      ENDPOINTS.ADMIN.PRODUCTS.AUDIT(id),
      {
        params: { page, limit },
      },
    );
    return response.data!;
  },
};

export default productsService;
