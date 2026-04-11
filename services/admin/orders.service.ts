/**
 * Admin Orders Service
 * Order management operations
 */

import http, { type PaginatedResponse } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Order,
  OrdersQueryParams,
  UpdateOrderRequest,
  OrderStatus,
} from '@/types/api.types';

type AuditListResponse = {
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

export const ordersService = {
  /**
   * Get all orders with pagination and filters
   */
  getAll: async (params?: OrdersQueryParams) => {
    const response = await http.get<{
      orders: Order[];
      pagination: PaginatedResponse<Order>['pagination'];
    }>(ENDPOINTS.ADMIN.ORDERS.LIST, {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data!;
  },

  /**
   * Get single order by ID
   */
  getById: async (id: string) => {
    const response = await http.get<Order>(ENDPOINTS.ADMIN.ORDERS.DETAIL(id));
    return response.data!;
  },

  /**
   * Update order
   */
  update: async (id: string, data: UpdateOrderRequest) => {
    const response = await http.patch<{ order: Order }>(
      ENDPOINTS.ADMIN.ORDERS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật đơn hàng thành công!',
      },
    );
    return response.data!.order;
  },

  /**
   * Update order status only
   */
  updateStatus: async (id: string, status: OrderStatus) => {
    const response = await http.patch<{ order: Order }>(
      ENDPOINTS.ADMIN.ORDERS.UPDATE_STATUS(id),
      { status },
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật trạng thái thành công!',
      },
    );
    return response.data!.order;
  },

  /**
   * Get order audit logs
   */
  getAudit: async (id: string, page = 1, limit = 20) => {
    const response = await http.get<AuditListResponse>(
      ENDPOINTS.ADMIN.ORDERS.AUDIT(id),
      {
        params: { page, limit },
      },
    );
    return response.data!;
  },
};

export default ordersService;
