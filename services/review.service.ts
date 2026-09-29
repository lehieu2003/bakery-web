import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { CreateReviewRequest, Review } from '@/types/api.types';

interface ProductReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface SubmitReviewResponse {
  review: Review;
}

export const reviewService = {
  getProductReviews: async (productId: string, page = 1) => {
    const response = await http.get<ProductReviewsResponse>(
      ENDPOINTS.REVIEWS.LIST(productId),
      {
        params: { page },
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return {
      reviews: response.data!.reviews,
      pagination: response.data!.pagination,
    };
  },

  submitReview: async (productId: string, input: CreateReviewRequest) => {
    const response = await http.post<SubmitReviewResponse>(
      ENDPOINTS.REVIEWS.LIST(productId),
      input,
      {
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!.review;
  },
};

export default reviewService;
