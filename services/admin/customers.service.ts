/**
 * Admin Customers Service
 * Customer management operations
 */

import http, { type PaginatedResponse } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Customer,
  CustomersQueryParams,
  UpdateCustomerRequest,
} from '@/types/api.types';

export const customersService = {
  /**
   * Get all customers with pagination and filters
   */
  getAll: async (params?: CustomersQueryParams) => {
    const response = await http.get<{
      customers: Customer[];
      pagination: PaginatedResponse<Customer>['pagination'];
    }>(ENDPOINTS.ADMIN.CUSTOMERS.LIST, {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data!;
  },

  /**
   * Get single customer by ID
   */
  getById: async (id: string) => {
    const response = await http.get<{ customer: Customer }>(
      ENDPOINTS.ADMIN.CUSTOMERS.DETAIL(id),
    );
    return response.data!.customer;
  },

  /**
   * Update customer
   */
  update: async (id: string, data: UpdateCustomerRequest) => {
    const response = await http.patch<{ customer: Customer }>(
      ENDPOINTS.ADMIN.CUSTOMERS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật khách hàng thành công!',
      },
    );
    return response.data!.customer;
  },
};

export default customersService;
