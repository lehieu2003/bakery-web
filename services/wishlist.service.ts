import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { WishlistItem } from '@/types/api.types';

interface WishlistResponse {
  wishlist: WishlistItem[];
}

interface AddWishlistResponse {
  item: WishlistItem;
  isFavorite: boolean;
}

interface RemoveWishlistResponse {
  productId: string;
  removed: boolean;
  isFavorite: boolean;
}

export const wishlistService = {
  getMyWishlist: async () => {
    const response = await http.get<WishlistResponse>(ENDPOINTS.WISHLIST.LIST, {
      showErrorToast: false,
      skipAuthRedirect: true,
    });
    return response.data!.wishlist;
  },

  addToWishlist: async (productId: string) => {
    const response = await http.post<AddWishlistResponse>(
      ENDPOINTS.WISHLIST.ADD,
      { productId },
      {
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!;
  },

  removeFromWishlist: async (productId: string) => {
    const response = await http.delete<RemoveWishlistResponse>(
      ENDPOINTS.WISHLIST.REMOVE,
      {
        body: JSON.stringify({ productId }),
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!;
  },
};

export default wishlistService;
