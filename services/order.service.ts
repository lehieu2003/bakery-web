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
  incentiveCodes?: string[];
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface PreviewIncentivePayload {
  incentiveCode?: string;
  incentiveCodes?: string[];
  items: Array<{
    productId: string;
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
  appliedIncentives?: AppliedIncentiveSummary[] | null;
}

export interface PreviewIncentiveResponse {
  subtotal: number;
  membershipDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  total: number;
  appliedIncentive?: AppliedIncentiveSummary | null;
  appliedIncentives?: AppliedIncentiveSummary[] | null;
}

export type ReorderUnavailableReason =
  | 'PRODUCT_UNAVAILABLE'
  | 'VARIANT_UNAVAILABLE'
  | 'INSUFFICIENT_STOCK';

export interface ReorderPreparedItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  price: number;
  quantity: number;
  image: string;
  type: 'cake' | 'ingredient';
}

export interface ReorderUnavailableItem {
  productId: string;
  variantId: string | null;
  name: string;
  reason: ReorderUnavailableReason;
  requestedQuantity: number;
  availableQuantity: number;
  guidance: string;
}

export interface PrepareReorderResponse {
  sourceOrderId: string;
  sourceOrderNumber: string;
  items: ReorderPreparedItem[];
  unavailableItems: ReorderUnavailableItem[];
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

  previewIncentive: async (
    payload: PreviewIncentivePayload,
  ): Promise<PreviewIncentiveResponse> => {
    const response = await http.post<PreviewIncentiveResponse>(
      ENDPOINTS.INCENTIVES.PREVIEW,
      payload,
      { showErrorToast: false },
    );
    return response.data!;
  },

  prepareReorder: async (orderId: string): Promise<PrepareReorderResponse> => {
    const response = await http.post<PrepareReorderResponse>(
      ENDPOINTS.ORDERS_REORDER,
      { orderId },
      {
        skipAuthRedirect: true,
        showErrorToast: false,
      },
    );
    return response.data!;
  },
};
