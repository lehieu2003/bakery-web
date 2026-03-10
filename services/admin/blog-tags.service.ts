import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  BlogTag,
  CreateBlogTagRequest,
  UpdateBlogTagRequest,
} from '@/types/api.types';

export const blogTagsService = {
  getAll: async () => {
    const response = await http.get<{ tags: BlogTag[] }>(
      ENDPOINTS.ADMIN.BLOG_TAGS.LIST,
    );
    return response.data!;
  },

  getById: async (id: string) => {
    const response = await http.get<BlogTag>(
      ENDPOINTS.ADMIN.BLOG_TAGS.DETAIL(id),
    );
    return response.data!;
  },

  create: async (data: CreateBlogTagRequest) => {
    const response = await http.post<BlogTag>(
      ENDPOINTS.ADMIN.BLOG_TAGS.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo tag thành công!',
      },
    );
    return response.data!;
  },

  update: async (id: string, data: UpdateBlogTagRequest) => {
    const response = await http.put<BlogTag>(
      ENDPOINTS.ADMIN.BLOG_TAGS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật tag thành công!',
      },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.BLOG_TAGS.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa tag thành công!',
      },
    );
    return response.data!;
  },
};

export default blogTagsService;
