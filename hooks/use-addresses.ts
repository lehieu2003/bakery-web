'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { addressService } from '@/services/address.service';
import type {
  CreateAddressRequest,
  UpdateAddressRequest,
} from '@/types/api.types';

export const addressesKeys = {
  all: ['addresses'] as const,
  list: () => [...addressesKeys.all, 'list'] as const,
};

export function useAddresses(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: addressesKeys.list(),
    queryFn: () => addressService.getMyAddresses(),
    enabled: (options?.enabled ?? true) && isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAddressRequest) =>
      addressService.createAddress(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressesKeys.all });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAddressRequest }) =>
      addressService.updateAddress(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressesKeys.all });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => addressService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressesKeys.all });
    },
  });
}
