'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuService } from '@/services/admin';
import type {
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
} from '@/types/api.types';

export const menuKeys = {
  all: ['admin', 'menu'] as const,
  lists: () => [...menuKeys.all, 'list'] as const,
  list: () => [...menuKeys.lists()] as const,
  details: () => [...menuKeys.all, 'detail'] as const,
  detail: (id: string) => [...menuKeys.details(), id] as const,
};

export function useMenuItems() {
  return useQuery({
    queryKey: menuKeys.list(),
    queryFn: () => menuService.getAll(),
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: menuKeys.detail(id),
    queryFn: () => menuService.getById(id),
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMenuItemRequest) => menuService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.lists() });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuItemRequest }) =>
      menuService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.lists() });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(id) });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => menuService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.lists() });
    },
  });
}
