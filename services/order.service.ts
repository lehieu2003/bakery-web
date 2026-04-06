import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Order } from '@/types/api.types';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'MOMO' | 'ZALOPAY';
  incentiveCode?: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface AppliedIncentiveSummary {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  discount: number;
}

export interface CreateOrderResponse {
  order: Order;
  paymentUrl: string | null;
  paymentError?: string;
  appliedIncentive?: AppliedIncentiveSummary | null;
}

export interface GetMyOrdersOptions {
  skipAuthRedirect?: boolean;
}

export const orderService = {
  getMyOrders: async (options?: GetMyOrdersOptions): Promise<Order[]> => {
    const response = await http.get<{ orders: Order[] }>(ENDPOINTS.ORDERS, {
      skipAuthRedirect: options?.skipAuthRedirect,
    });
    return response.data!.orders;
  },

  createOrder: async (
    payload: CreateOrderPayload,
  ): Promise<CreateOrderResponse> => {
    const response = await http.post<CreateOrderResponse>(
      ENDPOINTS.ORDERS,
      payload,
      { showErrorToast: false },
    );
    return response.data!;
  },
};
