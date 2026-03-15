'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productAttributesService } from '@/services/admin';
import type {
  CreateProductAttributeRequest,
  UpdateProductAttributeRequest,
} from '@/types/api.types';

export const productAttributeKeys = {
  all: ['admin', 'product-attributes'] as const,
  lists: () => [...productAttributeKeys.all, 'list'] as const,
  list: () => [...productAttributeKeys.lists()] as const,
  details: () => [...productAttributeKeys.all, 'detail'] as const,
  detail: (id: string) => [...productAttributeKeys.details(), id] as const,
};

export function useProductAttributes() {
  return useQuery({
    queryKey: productAttributeKeys.list(),
    queryFn: () => productAttributesService.getAll(),
  });
}

export function useProductAttribute(id: string) {
  return useQuery({
    queryKey: productAttributeKeys.detail(id),
    queryFn: () => productAttributesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductAttributeRequest) =>
      productAttributesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productAttributeKeys.lists() });
    },
  });
}

export function useUpdateProductAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductAttributeRequest }) =>
      productAttributesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productAttributeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productAttributeKeys.detail(id) });
    },
  });
}

export function useDeleteProductAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productAttributesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productAttributeKeys.lists() });
    },
  });
}
