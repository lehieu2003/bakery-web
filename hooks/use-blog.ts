'use client';

import { useQuery } from '@tanstack/react-query';
import { blogService } from '@/services/blog.service';
import type { BlogPostsQueryParams } from '@/types/api.types';

export const blogKeys = {
  all: ['blog'] as const,
  posts: () => [...blogKeys.all, 'posts'] as const,
  postList: (params?: BlogPostsQueryParams) =>
    [...blogKeys.posts(), params] as const,
  post: (slug: string) => [...blogKeys.all, 'post', slug] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
  tags: () => [...blogKeys.all, 'tags'] as const,
};

export function usePublicBlogPosts(params?: BlogPostsQueryParams) {
  return useQuery({
    queryKey: blogKeys.postList(params),
    queryFn: () => blogService.getPosts(params),
    staleTime: 3 * 60 * 1000,
  });
}

export function usePublicBlogPost(slug: string) {
  return useQuery({
    queryKey: blogKeys.post(slug),
    queryFn: () => blogService.getPostBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicBlogCategories() {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: blogService.getCategories,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicBlogTags() {
  return useQuery({
    queryKey: blogKeys.tags(),
    queryFn: blogService.getTags,
    staleTime: 10 * 60 * 1000,
  });
}
