import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  NotificationListItem,
  UserNotificationsQueryParams,
} from '@/types/api.types';

export interface UserNotificationListResponse {
  notifications: NotificationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationsService = {
  getMyNotifications: async (params?: UserNotificationsQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.unreadOnly !== undefined) {
      searchParams.set('unreadOnly', String(params.unreadOnly));
    }

    const query = searchParams.toString();
    const url = `${ENDPOINTS.NOTIFICATIONS.LIST}${query ? `?${query}` : ''}`;
    const response = await http.get<UserNotificationListResponse>(url);
    return response.data!;
  },

  markAsRead: async (id: string) => {
    const response = await http.post<{
      notificationId: string;
      readAt: string;
    }>(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    return response.data!;
  },

  markAllAsRead: async () => {
    const response = await http.post<{ count: number }>(
      ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
    );
    return response.data!;
  },
};

export default notificationsService;
