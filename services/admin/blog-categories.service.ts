import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  BlogCategory,
  CreateBlogCategoryRequest,
  UpdateBlogCategoryRequest,
} from '@/types/api.types';

export const blogCategoriesService = {
  getAll: async () => {
    const response = await http.get<{ categories: BlogCategory[] }>(
      ENDPOINTS.ADMIN.BLOG_CATEGORIES.LIST,
    );
    return response.data!;
  },

  getById: async (id: string) => {
    const response = await http.get<BlogCategory>(
      ENDPOINTS.ADMIN.BLOG_CATEGORIES.DETAIL(id),
    );
    return response.data!;
  },

  create: async (data: CreateBlogCategoryRequest) => {
    const response = await http.post<BlogCategory>(
      ENDPOINTS.ADMIN.BLOG_CATEGORIES.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo danh mục blog thành công!',
      },
    );
    return response.data!;
  },

  update: async (id: string, data: UpdateBlogCategoryRequest) => {
    const response = await http.put<BlogCategory>(
      ENDPOINTS.ADMIN.BLOG_CATEGORIES.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật danh mục blog thành công!',
      },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.BLOG_CATEGORIES.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa danh mục blog thành công!',
      },
    );
    return response.data!;
  },
};

export default blogCategoriesService;
