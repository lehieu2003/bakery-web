'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogTagsService } from '@/services/admin';
import type {
  CreateBlogTagRequest,
  UpdateBlogTagRequest,
} from '@/types/api.types';

export const blogTagKeys = {
  all: ['admin', 'blog-tags'] as const,
  lists: () => [...blogTagKeys.all, 'list'] as const,
  list: () => [...blogTagKeys.lists()] as const,
  details: () => [...blogTagKeys.all, 'detail'] as const,
  detail: (id: string) => [...blogTagKeys.details(), id] as const,
};

export function useBlogTags() {
  return useQuery({
    queryKey: blogTagKeys.list(),
    queryFn: () => blogTagsService.getAll(),
  });
}

export function useBlogTag(id: string) {
  return useQuery({
    queryKey: blogTagKeys.detail(id),
    queryFn: () => blogTagsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBlogTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlogTagRequest) => blogTagsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogTagKeys.lists() });
    },
  });
}

export function useUpdateBlogTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogTagRequest }) =>
      blogTagsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogTagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogTagKeys.detail(id) });
    },
  });
}

export function useDeleteBlogTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => blogTagsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogTagKeys.lists() });
    },
  });
}
