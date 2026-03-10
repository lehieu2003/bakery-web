import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  MenuItem,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
} from '@/types/api.types';

export const menuService = {
  getAll: async () => {
    const response = await http.get<MenuItem[]>(ENDPOINTS.ADMIN.MENU.LIST);
    return response.data!;
  },

  getById: async (id: string) => {
    const response = await http.get<MenuItem>(ENDPOINTS.ADMIN.MENU.DETAIL(id));
    return response.data!;
  },

  create: async (data: CreateMenuItemRequest) => {
    const response = await http.post<MenuItem>(
      ENDPOINTS.ADMIN.MENU.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo menu thành công!',
      },
    );
    return response.data!;
  },

  update: async (id: string, data: UpdateMenuItemRequest) => {
    const response = await http.put<MenuItem>(
      ENDPOINTS.ADMIN.MENU.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật menu thành công!',
      },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.MENU.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa menu thành công!',
      },
    );
    return response.data!;
  },
};

export default menuService;
