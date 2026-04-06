import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';

type UseOrdersOptions = {
  enabled?: boolean;
};

export function useOrders(options?: UseOrdersOptions) {
  const isEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['orders', isEnabled ? 'auth' : 'guest'],
    queryFn: () => orderService.getMyOrders({ skipAuthRedirect: true }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
