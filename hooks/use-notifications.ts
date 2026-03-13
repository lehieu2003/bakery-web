'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import type { UserNotificationsQueryParams } from '@/types/api.types';

export const userNotificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...userNotificationKeys.all, 'list'] as const,
  list: (params?: UserNotificationsQueryParams) =>
    [...userNotificationKeys.lists(), params] as const,
  infinite: (params?: { limit?: number; unreadOnly?: boolean }) =>
    [...userNotificationKeys.all, 'infinite', params] as const,
};

export function useUserNotifications(
  params?: UserNotificationsQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: userNotificationKeys.list(params),
    queryFn: () => notificationsService.getMyNotifications(params),
    enabled: options?.enabled ?? true,
  });
}

export function useInfiniteUserNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}) {
  const limit = options?.limit ?? 10;
  const unreadOnly = options?.unreadOnly;

  return useInfiniteQuery({
    queryKey: userNotificationKeys.infinite({ limit, unreadOnly }),
    initialPageParam: 1,
    enabled: options?.enabled ?? true,
    queryFn: ({ pageParam }) =>
      notificationsService.getMyNotifications({
        page: pageParam,
        limit,
        unreadOnly,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userNotificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userNotificationKeys.all });
    },
  });
}
