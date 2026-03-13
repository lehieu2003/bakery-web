import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  AdminNotificationsQueryParams,
  CreateNotificationRequest,
  NotificationListItem,
  UpdateNotificationRequest,
} from '@/types/api.types';

interface NotificationListResponse {
  notifications: NotificationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationsService = {
  getAll: async (params?: AdminNotificationsQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const url = `${ENDPOINTS.ADMIN.NOTIFICATIONS.LIST}${query ? `?${query}` : ''}`;

    const response = await http.get<NotificationListResponse>(url);
    return response.data!;
  },

  getById: async (id: string) => {
    const response = await http.get<NotificationListItem>(
      ENDPOINTS.ADMIN.NOTIFICATIONS.DETAIL(id),
    );
    return response.data!;
  },

  create: async (data: CreateNotificationRequest) => {
    const response = await http.post<NotificationListItem>(
      ENDPOINTS.ADMIN.NOTIFICATIONS.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo thông báo thành công!',
      },
    );
    return response.data!;
  },

  update: async (id: string, data: UpdateNotificationRequest) => {
    const response = await http.put<NotificationListItem>(
      ENDPOINTS.ADMIN.NOTIFICATIONS.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật thông báo thành công!',
      },
    );
    return response.data!;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.NOTIFICATIONS.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa thông báo thành công!',
      },
    );
    return response.data!;
  },
};

export default notificationsService;
