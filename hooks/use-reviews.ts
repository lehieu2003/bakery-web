/**
 * Review Hooks
 * React Query hooks for product reviews
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { reviewService } from '@/services/review.service';
import type { CreateReviewRequest } from '@/types/api.types';

export const reviewsKeys = {
  all: ['reviews'] as const,
  product: (productId: string) =>
    [...reviewsKeys.all, 'product', productId] as const,
};

export function useProductReviews(
  productId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: reviewsKeys.product(productId),
    queryFn: () => reviewService.getProductReviews(productId),
    enabled: (options?.enabled ?? true) && !!productId,
    staleTime: 60 * 1000,
  });
}

export function useSubmitReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewRequest) =>
      reviewService.submitReview(productId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reviewsKeys.product(productId),
      });
      await queryClient.invalidateQueries({
        queryKey: productKeys.details(),
      });
    },
  });
}
