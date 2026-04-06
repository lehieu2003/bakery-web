import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Product } from '@/types/api.types';

export type PersonalizedRecommendationSource =
  | 'behavioral'
  | 'hybrid'
  | 'fallback';

export type PersonalizedRecommendationReason =
  | 'no-user'
  | 'no-signal'
  | 'insufficient-signal'
  | 'behavior-match';

export interface PersonalizedRecommendationsPayload {
  products: Product[];
  source: PersonalizedRecommendationSource;
  reason: PersonalizedRecommendationReason;
}

export interface GetPersonalizedRecommendationsOptions {
  limit?: number;
}

export const personalizedRecommendationService = {
  getPersonalized: async (
    options?: GetPersonalizedRecommendationsOptions,
  ): Promise<PersonalizedRecommendationsPayload> => {
    const response = await http.get<PersonalizedRecommendationsPayload>(
      ENDPOINTS.PUBLIC.PERSONALIZED_PRODUCTS,
      {
        params: {
          limit: options?.limit,
        },
        skipAuthRedirect: true,
        showErrorToast: false,
      },
    );

    return (
      response.data ?? {
        products: [],
        source: 'fallback',
        reason: 'no-signal',
      }
    );
  },
};

export default personalizedRecommendationService;
