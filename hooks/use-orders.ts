import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getMyOrders(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
