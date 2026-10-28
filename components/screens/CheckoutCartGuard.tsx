'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-store';

/**
 * Keeps the checkout steps out of reach with an empty cart: opened that way
 * (a bookmark, the back button after an order), they show an empty state
 * instead of a form for a 0đ order.
 *
 * The check runs once, when the saved cart has loaded. A cart emptied later
 * on the page — a cash order clears it just before going to the success
 * page — does not swap the page out mid-navigation.
 */
export function CheckoutCartGuard({ children }: { children: React.ReactNode }) {
  const { cart, cartReady } = useCart();
  const [emptyOnArrival, setEmptyOnArrival] = useState<boolean | null>(null);

  if (cartReady && emptyOnArrival === null) {
    setEmptyOnArrival(cart.length === 0);
  }

  if (emptyOnArrival === null) {
    return <div className='min-h-[60vh] bg-background' aria-busy='true' />;
  }

  if (emptyOnArrival) {
    return (
      <div className='bg-background'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-center justify-center py-24 gap-6 text-center'>
          <div className='w-20 h-20 rounded-full bg-secondary flex items-center justify-center'>
            <ShoppingBag size={28} className='text-muted-foreground' />
          </div>
          <div>
            <h1 className='font-serif text-xl font-semibold text-foreground mb-1'>
              Giỏ hàng đang trống
            </h1>
            <p className='text-sm text-muted-foreground'>
              Thêm vài chiếc bánh vào giỏ trước khi thanh toán nhé.
            </p>
          </div>
          <Link
            href='/'
            className='px-8 py-3 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors'
          >
            Xem thực đơn
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
