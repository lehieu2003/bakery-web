import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Order } from '@/types/api.types';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'MOMO' | 'VNPAY';
  deliveryMethod?: 'pickup' | 'delivery';
  incentiveCode?: string;
  incentiveCodes?: string[];
  pickupDate?: string;
  addressId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    message?: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface PreviewIncentivePayload {
  incentiveCode?: string;
  incentiveCodes?: string[];
  deliveryMethod?: 'pickup' | 'delivery';
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
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
  /** Only present when the request carried an explicit deliveryMethod. */
  deliveryFee?: number;
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
  page?: number;
  limit?: number;
}

/** One page of GET /api/orders, newest first. */
export interface MyOrdersPage {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const orderService = {
  getMyOrders: async (options?: GetMyOrdersOptions): Promise<MyOrdersPage> => {
    const response = await http.get<MyOrdersPage>(ENDPOINTS.ORDERS, {
      params: { page: options?.page, limit: options?.limit },
      skipAuthRedirect: options?.skipAuthRedirect,
    });
    return response.data!;
  },

  getOrderByNumber: async (orderNumber: string): Promise<Order> => {
    const response = await http.get<{ order: Order }>(
      ENDPOINTS.ORDERS_DETAIL(orderNumber),
      { showErrorToast: false },
    );
    return response.data!.order;
  },

  createOrder: async (
    payload: CreateOrderPayload,
    options?: { idempotencyKey?: string },
  ): Promise<CreateOrderResponse> => {
    const response = await http.post<CreateOrderResponse>(
      ENDPOINTS.ORDERS,
      payload,
      {
        showErrorToast: false,
        ...(options?.idempotencyKey
          ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
          : {}),
      },
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
