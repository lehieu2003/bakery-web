import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';

type UseOrdersOptions = {
  enabled?: boolean;
};

export const orderKeys = {
  all: ['orders'] as const,
  list: (scope: 'auth' | 'guest') => [...orderKeys.all, scope] as const,
};

/** Orders per page; the server caps it at 50. */
const ORDERS_PAGE_SIZE = 20;

/**
 * The signed-in customer's orders, newest first, one page at a time.
 * `data` is every loaded page flattened; `fetchNextPage` loads older ones.
 */
export function useOrders(options?: UseOrdersOptions) {
  const isEnabled = options?.enabled ?? true;

  return useInfiniteQuery({
    queryKey: orderKeys.list(isEnabled ? 'auth' : 'guest'),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      orderService.getMyOrders({
        skipAuthRedirect: true,
        page: pageParam,
        limit: ORDERS_PAGE_SIZE,
      }),
    getNextPageParam: ({ pagination }) =>
      pagination.page < pagination.totalPages ? pagination.page + 1 : undefined,
    select: (data) => data.pages.flatMap((page) => page.orders),
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
