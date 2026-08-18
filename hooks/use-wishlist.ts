'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { wishlistService } from '@/services/wishlist.service';
import type { WishlistItem } from '@/types/api.types';

export const wishlistKeys = {
  all: ['wishlist'] as const,
  list: () => [...wishlistKeys.all, 'list'] as const,
};

export function useWishlist(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: wishlistKeys.list(),
    queryFn: () => wishlistService.getMyWishlist(),
    enabled: (options?.enabled ?? true) && isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistService.addToWishlist(productId),
    onSuccess: (response) => {
      const previous = queryClient.getQueryData<WishlistItem[]>(
        wishlistKeys.list(),
      );
      const exists = previous?.some((item) => item.productId === response.item.productId);
      if (exists) return;

      queryClient.setQueryData<WishlistItem[]>(wishlistKeys.list(), (current) => {
        const safeCurrent = current ?? [];
        return [response.item, ...safeCurrent];
      });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      wishlistService.removeFromWishlist(productId),
    onSuccess: (response) => {
      queryClient.setQueryData<WishlistItem[]>(wishlistKeys.list(), (current) => {
        const safeCurrent = current ?? [];
        return safeCurrent.filter((item) => item.productId !== response.productId);
      });
    },
  });
}

export function useToggleWishlist(productId?: string) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wishlistQuery = useWishlist();
  const addMutation = useAddToWishlist();
  const removeMutation = useRemoveFromWishlist();

  const isFavorite = useMemo(() => {
    if (!productId || !wishlistQuery.data) return false;
    return wishlistQuery.data.some((item: WishlistItem) => item.productId === productId);
  }, [productId, wishlistQuery.data]);

  const toggleFavorite = async () => {
    if (!productId || !isAuthenticated) return;

    if (isFavorite) {
      queryClient.setQueryData<WishlistItem[]>(wishlistKeys.list(), (current) => {
        const safeCurrent = current ?? [];
        return safeCurrent.filter((item) => item.productId !== productId);
      });

      try {
        await removeMutation.mutateAsync(productId);
      } catch {
        await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      }
      return;
    }

    queryClient.setQueryData<WishlistItem[]>(wishlistKeys.list(), (current) => {
      const safeCurrent = current ?? [];
      const exists = safeCurrent.some((item) => item.productId === productId);
      if (exists) return safeCurrent;

      return [
        {
          id: `optimistic-${productId}`,
          userId: 'current-user',
          productId,
          createdAt: new Date().toISOString(),
        },
        ...safeCurrent,
      ];
    });

    try {
      await addMutation.mutateAsync(productId);
    } catch {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    }
  };

  return {
    wishlist: wishlistQuery.data ?? [],
    isLoading: wishlistQuery.isLoading,
    isFetching: wishlistQuery.isFetching,
    isFavorite,
    toggleFavorite,
    isToggling: addMutation.isPending || removeMutation.isPending,
  };
}
