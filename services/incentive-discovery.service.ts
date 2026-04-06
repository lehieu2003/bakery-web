import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { DiscountType } from '@/types/api.types';

export interface AvailableIncentive {
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  endAt: string;
}

export interface GetAvailableIncentivesOptions {
  subtotal?: number;
  cart?: Array<{
    productId: string;
    quantity: number;
  }>;
  productIds?: string[];
}

function serializeCartParam(
  cart?: Array<{ productId: string; quantity: number }>,
): string | undefined {
  if (!cart?.length) return undefined;

  const quantityByProductId = new Map<string, number>();
  for (const item of cart) {
    const productId = item.productId?.trim();
    if (!productId) continue;
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;

    const current = quantityByProductId.get(productId) ?? 0;
    quantityByProductId.set(productId, current + item.quantity);
  }

  if (quantityByProductId.size === 0) return undefined;

  return Array.from(quantityByProductId.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productId, quantity]) => `${productId}:${quantity}`)
    .join(',');
}

export const incentiveDiscoveryService = {
  getAvailable: async (
    options?: GetAvailableIncentivesOptions,
  ): Promise<AvailableIncentive[]> => {
    const response = await http.get<{ incentives: AvailableIncentive[] }>(
      ENDPOINTS.INCENTIVES.AVAILABLE,
      {
        params: {
          subtotal: options?.subtotal,
          cart: serializeCartParam(options?.cart),
          productIds: options?.productIds?.length
            ? options.productIds.join(',')
            : undefined,
        },
        skipAuthRedirect: true,
        showErrorToast: false,
      },
    );

    return response.data?.incentives ?? [];
  },
};

export default incentiveDiscoveryService;
