import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  BlogPost,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  BlogPostStatus,
  BlogPostsQueryParams,
} from '@/types/api.types';

export const blogPostsService = {
  getAll: async (params?: BlogPostsQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.tagId) searchParams.set('tagId', params.tagId);

    const query = searchParams.toString();
    const url = `${ENDPOINTS.ADMIN.BLOG_POSTS.LIST}${query ? `?${query}` : ''}`;
    const response = await http.get<{
      posts: BlogPost[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(url);
    return response.data!;
  },

  getById: async (id: string) => {
    const response = await http.get<BlogPost>(
      ENDPOINTS.ADMIN.BLOG_POSTS.DETAIL(id),
    );
    return response.data!;
  },

  create: async (data: CreateBlogPostRequest) => {
    const response = await http.post<BlogPost>(
      ENDPOINTS.ADMIN.BLOG_POSTS.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo bài viết thành công!',
      },
    );
    return response.data!;
  },

  update: async (id: string, data: UpdateBlogPostRequest) => {
    const response = await http.put<BlogPost>(
      ENDPOINTS.ADMIN.BLOG_POSTS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật bài viết thành công!',
      },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.BLOG_POSTS.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa bài viết thành công!',
      },
    );
    return response.data!;
  },

  updateStatus: async (id: string, status: BlogPostStatus) => {
    const response = await http.patch<BlogPost>(
      ENDPOINTS.ADMIN.BLOG_POSTS.UPDATE_STATUS(id),
      { status },
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật trạng thái thành công!',
      },
    );
    return response.data!;
  },
};

export default blogPostsService;
