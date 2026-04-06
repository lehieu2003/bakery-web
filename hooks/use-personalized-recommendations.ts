import { useQuery } from '@tanstack/react-query';
import { personalizedRecommendationService } from '@/services/personalized-recommendation.service';

export const personalizedRecommendationsKeys = {
  all: ['products', 'personalized'] as const,
  byLimit: (limit?: number) =>
    [...personalizedRecommendationsKeys.all, limit ?? 'default'] as const,
};

type UsePersonalizedRecommendationsOptions = {
  limit?: number;
  enabled?: boolean;
};

export function usePersonalizedRecommendations(
  options?: UsePersonalizedRecommendationsOptions,
) {
  const limit = options?.limit;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: personalizedRecommendationsKeys.byLimit(limit),
    queryFn: () =>
      personalizedRecommendationService.getPersonalized({
        limit,
      }),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}
