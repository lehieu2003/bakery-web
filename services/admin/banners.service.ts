/**
 * Admin Banners Service
 * CRUD operations for banners management
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Banner,
  CreateBannerRequest,
  UpdateBannerRequest,
} from '@/types/api.types';

export const bannersService = {
  /**
   * Get all banners
   */
  getAll: async () => {
    const response = await http.get<Banner[]>(ENDPOINTS.ADMIN.BANNERS.LIST);
    return response.data!;
  },

  /**
   * Get single banner by ID
   */
  getById: async (id: string) => {
    const response = await http.get<Banner>(ENDPOINTS.ADMIN.BANNERS.DETAIL(id));
    return response.data!;
  },

  /**
   * Create new banner
   */
  create: async (data: CreateBannerRequest) => {
    const response = await http.post<Banner>(
      ENDPOINTS.ADMIN.BANNERS.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo banner thành công!',
      },
    );
    return response.data!;
  },

  /**
   * Update banner
   */
  update: async (id: string, data: UpdateBannerRequest) => {
    const response = await http.put<Banner>(
      ENDPOINTS.ADMIN.BANNERS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật banner thành công!',
      },
    );
    return response.data!;
  },

  /**
   * Delete banner
   */
  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.BANNERS.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa banner thành công!',
      },
    );
    return response.data!;
  },
};

export default bannersService;
