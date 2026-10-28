import Image from 'next/image';
import { Check, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';

/** One toast for adds in a row: each new add replaces it instead of stacking. */
export const ADDED_TO_CART_TOAST_ID = 'added-to-cart';

type AddedItem = { name: string; quantity: number; image?: string };

export function AddedToCartToast({
  item,
  onViewCart,
  onClose,
}: {
  item: AddedItem;
  onViewCart: () => void;
  onClose: () => void;
}) {
  return (
    <div className='flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 pr-2 font-sans shadow-lg shadow-foreground/5'>
      <div className='relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary'>
        {item.image ? (
          <Image src={item.image} alt='' fill sizes='48px' className='object-cover' />
        ) : (
          <ShoppingBag size={18} className='text-muted-foreground' />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='flex items-center gap-1 text-xs font-medium text-primary'>
          <Check size={14} strokeWidth={2.5} aria-hidden='true' />
          Đã thêm vào giỏ hàng
        </p>
        <p className='mt-0.5 truncate text-sm font-semibold text-foreground'>
          {item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name}
        </p>
      </div>
      <button
        type='button'
        onClick={onViewCart}
        className='shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90'
      >
        Xem giỏ
      </button>
      <button
        type='button'
        onClick={onClose}
        aria-label='Đóng thông báo'
        className='shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Confirms an add to cart. Products are only added on storefront pages,
 * where the order summary drawer exists, so "Xem giỏ" opens the drawer.
 */
export function notifyAddedToCart(item: AddedItem, openOrderSummary: () => void) {
  const close = () => toast.dismiss(ADDED_TO_CART_TOAST_ID);
  toast.custom(
    () => (
      <AddedToCartToast
        item={item}
        onViewCart={() => {
          openOrderSummary();
          close();
        }}
        onClose={close}
      />
    ),
    { id: ADDED_TO_CART_TOAST_ID },
  );
}
