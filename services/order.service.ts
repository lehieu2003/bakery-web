import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Order } from '@/types/api.types';

export const orderService = {
  getMyOrders: async (): Promise<Order[]> => {
    const response = await http.get<{ orders: Order[] }>(ENDPOINTS.ORDERS);
    return response.orders;
  },
};
