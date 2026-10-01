/**
 * Admin Coupons Service
 * CRUD operations for coupon management
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export interface AdminCoupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: string;
  minOrder: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  _count?: { redemptions: number };
}

export interface CreateCouponRequest {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder?: number | null;
  maxDiscount?: number | null;
  startAt: string;
  endAt: string;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  isActive?: boolean;
}

export interface UpdateCouponRequest {
  isActive?: boolean;
  usageLimit?: number | null;
}

export const couponsService = {
  getAll: async () => {
    const response = await http.get<{ coupons: AdminCoupon[] }>(
      ENDPOINTS.ADMIN.COUPONS.LIST,
    );
    return response.data!.coupons;
  },

  create: async (data: CreateCouponRequest) => {
    const response = await http.post<AdminCoupon>(
      ENDPOINTS.ADMIN.COUPONS.CREATE,
      data,
      { showSuccessToast: true, successMessage: 'Tạo coupon thành công!' },
    );
    return response.data!;
  },

  update: async (id: string, data: UpdateCouponRequest) => {
    const response = await http.put<AdminCoupon>(
      ENDPOINTS.ADMIN.COUPONS.UPDATE(id),
      data,
      { showSuccessToast: true, successMessage: 'Cập nhật coupon thành công!' },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ deleted: boolean }>(
      ENDPOINTS.ADMIN.COUPONS.UPDATE(id),
      { showSuccessToast: true, successMessage: 'Xóa coupon thành công!' },
    );
    return response.data!;
  },
};
