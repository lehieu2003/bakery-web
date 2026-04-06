import { useQuery } from '@tanstack/react-query';
import { membershipBenefitsService } from '@/services/membership-benefits.service';

export const membershipBenefitsKeys = {
  all: ['membership', 'benefits'] as const,
  current: () => [...membershipBenefitsKeys.all, 'current'] as const,
};

type UseMembershipBenefitsOptions = {
  enabled?: boolean;
};

export function useMembershipBenefits(options?: UseMembershipBenefitsOptions) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: membershipBenefitsKeys.current(),
    queryFn: () => membershipBenefitsService.getCurrent({ skipAuthRedirect: true }),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
