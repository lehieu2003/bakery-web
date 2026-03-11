/**
 * Public Blog Service
 * Fetches publicly published blog posts, categories, and tags
 */

import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  BlogPost,
  BlogCategory,
  BlogTag,
  BlogPostsQueryParams,
} from '@/types/api.types';

export interface PublicBlogPostsResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const blogService = {
  /**
   * Get paginated list of published posts
   */
  getPosts: async (params?: BlogPostsQueryParams): Promise<PublicBlogPostsResponse> => {
    const response = await http.get<PublicBlogPostsResponse>(
      ENDPOINTS.PUBLIC.BLOG_POSTS,
      {
        params: {
          page: params?.page,
          limit: params?.limit ?? 9,
          search: params?.search,
          categorySlug: params?.categorySlug,
          tagSlug: params?.tagSlug,
        },
        showErrorToast: false,
      },
    );
    return response.data!;
  },

  /**
   * Get a single published post by slug
   */
  getPostBySlug: async (slug: string): Promise<BlogPost> => {
    const response = await http.get<BlogPost>(
      ENDPOINTS.PUBLIC.BLOG_POST_DETAIL(slug),
      { showErrorToast: false },
    );
    return response.data!;
  },

  /**
   * Get all active blog categories
   */
  getCategories: async (): Promise<BlogCategory[]> => {
    const response = await http.get<{ categories: BlogCategory[] }>(
      ENDPOINTS.PUBLIC.BLOG_CATEGORIES,
      { showErrorToast: false },
    );
    return response.data?.categories ?? [];
  },

  /**
   * Get all blog tags
   */
  getTags: async (): Promise<BlogTag[]> => {
    const response = await http.get<{ tags: BlogTag[] }>(
      ENDPOINTS.PUBLIC.BLOG_TAGS,
      { showErrorToast: false },
    );
    return response.data?.tags ?? [];
  },
};
