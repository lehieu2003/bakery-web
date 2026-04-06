import { useQuery } from '@tanstack/react-query';
import { incentiveDiscoveryService } from '@/services/incentive-discovery.service';

type IncentiveCartItem = {
  productId: string;
  quantity: number;
};

function serializeCartForKey(cart?: IncentiveCartItem[]): string {
  if (!cart?.length) return 'none';

  const quantityByProductId = new Map<string, number>();
  for (const item of cart) {
    const productId = item.productId?.trim();
    if (!productId) continue;
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;

    const current = quantityByProductId.get(productId) ?? 0;
    quantityByProductId.set(productId, current + item.quantity);
  }

  if (quantityByProductId.size === 0) return 'none';

  return Array.from(quantityByProductId.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productId, quantity]) => `${productId}:${quantity}`)
    .join(',');
}

export const availableIncentivesKeys = {
  all: ['incentives', 'available'] as const,
  byContext: (subtotal?: number, cart?: IncentiveCartItem[]) =>
    [...availableIncentivesKeys.all, subtotal ?? 'none', serializeCartForKey(cart)] as const,
};

type UseAvailableIncentivesOptions = {
  subtotal?: number;
  cart?: IncentiveCartItem[];
  enabled?: boolean;
};

export function useAvailableIncentives(options?: UseAvailableIncentivesOptions) {
  const enabled = options?.enabled ?? true;
  const subtotal = options?.subtotal;
  const cart = options?.cart;

  return useQuery({
    queryKey: availableIncentivesKeys.byContext(subtotal, cart),
    queryFn: () =>
      incentiveDiscoveryService.getAvailable({
        subtotal,
        cart,
      }),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}
