import { useMutation, useQuery } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';

type UseOrdersOptions = {
  enabled?: boolean;
};

export const orderKeys = {
  all: ['orders'] as const,
  list: (scope: 'auth' | 'guest') => [...orderKeys.all, scope] as const,
};

export function useOrders(options?: UseOrdersOptions) {
  const isEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: orderKeys.list(isEnabled ? 'auth' : 'guest'),
    queryFn: () => orderService.getMyOrders({ skipAuthRedirect: true }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePrepareReorder() {
  return useMutation({
    mutationFn: (payload: { orderId: string }) =>
      orderService.prepareReorder(payload.orderId),
  });
}
