import { useQuery } from '@tanstack/react-query';
import { incentiveDiscoveryService } from '@/services/incentive-discovery.service';

export const availableIncentivesKeys = {
  all: ['incentives', 'available'] as const,
  bySubtotal: (subtotal?: number) =>
    [...availableIncentivesKeys.all, subtotal ?? 'none'] as const,
};

type UseAvailableIncentivesOptions = {
  subtotal?: number;
  enabled?: boolean;
};

export function useAvailableIncentives(options?: UseAvailableIncentivesOptions) {
  const enabled = options?.enabled ?? true;
  const subtotal = options?.subtotal;

  return useQuery({
    queryKey: availableIncentivesKeys.bySubtotal(subtotal),
    queryFn: () =>
      incentiveDiscoveryService.getAvailable({
        subtotal,
      }),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}
