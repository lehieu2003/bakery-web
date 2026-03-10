'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogCategoriesService } from '@/services/admin';
import type {
  CreateBlogCategoryRequest,
  UpdateBlogCategoryRequest,
} from '@/types/api.types';

export const blogCategoryKeys = {
  all: ['admin', 'blog-categories'] as const,
  lists: () => [...blogCategoryKeys.all, 'list'] as const,
  list: () => [...blogCategoryKeys.lists()] as const,
  details: () => [...blogCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...blogCategoryKeys.details(), id] as const,
};

export function useBlogCategories() {
  return useQuery({
    queryKey: blogCategoryKeys.list(),
    queryFn: () => blogCategoriesService.getAll(),
  });
}

export function useBlogCategory(id: string) {
  return useQuery({
    queryKey: blogCategoryKeys.detail(id),
    queryFn: () => blogCategoriesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBlogCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlogCategoryRequest) =>
      blogCategoriesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() });
    },
  });
}

export function useUpdateBlogCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateBlogCategoryRequest;
    }) => blogCategoriesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogCategoryKeys.detail(id) });
    },
  });
}

export function useDeleteBlogCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => blogCategoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogCategoryKeys.lists() });
    },
  });
}
