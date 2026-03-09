import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Order } from '@/types/api.types';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
  paymentMethod: 'cash' | 'card' | 'momo' | 'zalopay';
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface CreateOrderResponse {
  order: Order;
  paymentUrl: string | null;
  paymentError?: string;
}

export const orderService = {
  getMyOrders: async (): Promise<Order[]> => {
    const response = await http.get<{ orders: Order[] }>(ENDPOINTS.ORDERS);
    return response.data!.orders;
  },

  createOrder: async (
    payload: CreateOrderPayload,
  ): Promise<CreateOrderResponse> => {
    const response = await http.post<CreateOrderResponse>(
      ENDPOINTS.ORDERS,
      payload,
    );
    return response.data!;
  },
};
