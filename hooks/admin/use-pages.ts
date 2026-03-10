'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pagesService } from '@/services/admin';
import type { CreatePageRequest, UpdatePageRequest } from '@/types/api.types';

export const pageKeys = {
  all: ['admin', 'pages'] as const,
  lists: () => [...pageKeys.all, 'list'] as const,
  list: () => [...pageKeys.lists()] as const,
  details: () => [...pageKeys.all, 'detail'] as const,
  detail: (id: string) => [...pageKeys.details(), id] as const,
};

export function usePages() {
  return useQuery({
    queryKey: pageKeys.list(),
    queryFn: () => pagesService.getAll(),
  });
}

export function usePage(id: string) {
  return useQuery({
    queryKey: pageKeys.detail(id),
    queryFn: () => pagesService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePageRequest) => pagesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePageRequest }) =>
      pagesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(id) });
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pagesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
  });
}
