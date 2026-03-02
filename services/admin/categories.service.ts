/**
 * Admin Categories Service
 * CRUD operations for categories management
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/types/api.types';

export const categoriesService = {
  /**
   * Get all categories
   */
  getAll: async () => {
    const response = await http.get<{ categories: Category[] }>(
      ENDPOINTS.ADMIN.CATEGORIES.LIST,
    );
    return response.data!.categories;
  },

  /**
   * Get single category by ID
   */
  getById: async (id: string) => {
    const response = await http.get<{ category: Category }>(
      ENDPOINTS.ADMIN.CATEGORIES.DETAIL(id),
    );
    return response.data!.category;
  },

  /**
   * Create new category
   */
  create: async (data: CreateCategoryRequest) => {
    const response = await http.post<{ category: Category }>(
      ENDPOINTS.ADMIN.CATEGORIES.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo danh mục thành công!',
      },
    );
    return response.data!.category;
  },

  /**
   * Update category
   */
  update: async (id: string, data: UpdateCategoryRequest) => {
    const response = await http.put<{ category: Category }>(
      ENDPOINTS.ADMIN.CATEGORIES.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật danh mục thành công!',
      },
    );
    return response.data!.category;
  },

  /**
   * Delete category
   */
  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.CATEGORIES.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa danh mục thành công!',
      },
    );
    return response.data!;
  },
};

export default categoriesService;
