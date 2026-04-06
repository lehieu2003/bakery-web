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
        },
        skipAuthRedirect: true,
        showErrorToast: false,
      },
    );

    return response.data?.incentives ?? [];
  },
};

export default incentiveDiscoveryService;
