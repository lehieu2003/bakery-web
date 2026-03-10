'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogPostsService } from '@/services/admin';
import type {
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  BlogPostStatus,
  BlogPostsQueryParams,
} from '@/types/api.types';

export const blogPostKeys = {
  all: ['admin', 'blog-posts'] as const,
  lists: () => [...blogPostKeys.all, 'list'] as const,
  list: (params?: BlogPostsQueryParams) =>
    [...blogPostKeys.lists(), params] as const,
  details: () => [...blogPostKeys.all, 'detail'] as const,
  detail: (id: string) => [...blogPostKeys.details(), id] as const,
};

export function useBlogPosts(params?: BlogPostsQueryParams) {
  return useQuery({
    queryKey: blogPostKeys.list(params),
    queryFn: () => blogPostsService.getAll(params),
  });
}

export function useBlogPost(id: string) {
  return useQuery({
    queryKey: blogPostKeys.detail(id),
    queryFn: () => blogPostsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlogPostRequest) => blogPostsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.lists() });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogPostRequest }) =>
      blogPostsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogPostKeys.detail(id) });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => blogPostsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.lists() });
    },
  });
}

export function useUpdateBlogPostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BlogPostStatus }) =>
      blogPostsService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogPostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blogPostKeys.detail(id) });
    },
  });
}
