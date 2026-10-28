import { toast } from 'sonner';

/** One toast for adds in a row: each new add replaces it instead of stacking. */
export const ADDED_TO_CART_TOAST_ID = 'added-to-cart';

/**
 * Confirms an add to cart. Products are only added on storefront pages,
 * where the order summary drawer exists, so the action opens the drawer.
 */
export function notifyAddedToCart(
  item: { name: string; quantity: number },
  openOrderSummary: () => void,
) {
  toast.success('Đã thêm vào giỏ hàng', {
    id: ADDED_TO_CART_TOAST_ID,
    description: item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name,
    action: { label: 'Xem giỏ hàng', onClick: openOrderSummary },
  });
}
