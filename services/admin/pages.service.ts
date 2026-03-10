import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Page,
  CreatePageRequest,
  UpdatePageRequest,
} from '@/types/api.types';

export const pagesService = {
  getAll: async () => {
    const response = await http.get<Page[]>(ENDPOINTS.ADMIN.PAGES.LIST);
    return response.data!;
  },

  getById: async (id: string) => {
    const response = await http.get<Page>(ENDPOINTS.ADMIN.PAGES.DETAIL(id));
    return response.data!;
  },

  create: async (data: CreatePageRequest) => {
    const response = await http.post<Page>(ENDPOINTS.ADMIN.PAGES.CREATE, data, {
      showSuccessToast: true,
      successMessage: 'Tạo trang thành công!',
    });
    return response.data!;
  },

  update: async (id: string, data: UpdatePageRequest) => {
    const response = await http.put<Page>(
      ENDPOINTS.ADMIN.PAGES.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật trang thành công!',
      },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.PAGES.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa trang thành công!',
      },
    );
    return response.data!;
  },
};

export default pagesService;
