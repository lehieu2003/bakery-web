import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { MembershipBenefitsResponse } from '@/types/api.types';

export interface GetMembershipBenefitsOptions {
  skipAuthRedirect?: boolean;
}

export const membershipBenefitsService = {
  getCurrent: async (
    options?: GetMembershipBenefitsOptions,
  ): Promise<MembershipBenefitsResponse> => {
    const response = await http.get<MembershipBenefitsResponse>(
      ENDPOINTS.MEMBERSHIP.BENEFITS,
      {
        skipAuthRedirect: options?.skipAuthRedirect ?? true,
        showErrorToast: false,
      },
    );

    return response.data!;
  },
};

export default membershipBenefitsService;
