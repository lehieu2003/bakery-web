'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart-store';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { formatVND } from '@/lib/admin-data';
import { hasOrderSummary } from '@/lib/order-summary';

export function FloatingOrderSummary() {
  const pathname = usePathname();
  const {
    cart,
    removeFromCart,
    updateQty,
    clearCart,
    orderSummaryOpen: isOpen,
    setOrderSummaryOpen: setIsOpen,
  } = useCart();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const hasItems = cartCount > 0;

  // Escape closes the drawer, like any other dialog.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setIsOpen]);

  // Leaving for a page without the drawer must not leave it open behind.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  if (!hasOrderSummary(pathname)) return null;

  return (
    <>
      {/* Backdrop overlay when open */}
      {isOpen && (
        <div
          role='presentation'
          onClick={() => setIsOpen(false)}
          className='fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity'
        />
      )}

      {/* Flyout Slide-in Drawer */}
      <aside
        aria-label='Tóm tắt đơn hàng'
        // Off-screen when closed: keep its controls out of the tab order.
        inert={!isOpen}
        className={`fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-card text-card-foreground border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className='p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <ShoppingBag className='size-5 text-primary' />
            <div>
              <h2 className='font-serif text-lg font-bold text-foreground leading-none'>
                Đơn hàng của bạn
              </h2>
              <p className='text-xs text-muted-foreground mt-1'>
                {cartCount > 0
                  ? `${cartCount} món đang được chọn`
                  : 'Giỏ hàng đang trống'}
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={() => setIsOpen(false)}
            aria-label='Đóng bảng đơn hàng'
            className='p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
          >
            <X className='size-5' />
          </button>
        </div>

        {/* Drawer Body: Item List */}
        <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-border/60'>
          {cart.length === 0 ? (
            <div className='h-full flex flex-col items-center justify-center text-center py-12 px-4'>
              <div className='w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4'>
                <ShoppingBag className='size-7' />
              </div>
              <h3 className='font-serif text-base font-semibold text-foreground mb-1'>
                Chưa có món nào trong giỏ
              </h3>
              <p className='text-xs text-muted-foreground max-w-xs mb-6'>
                Khám phá thực đơn bánh tươi và nguyên liệu cao cấp bạn yêu thích
                nhé!
              </p>
              <Link
                href='/'
                onClick={() => setIsOpen(false)}
                className='px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm'
              >
                Khám phá ngay
              </Link>
            </div>
          ) : (
            <div className='space-y-3.5 pt-1'>
              {cart.map((item) => (
                <div
                  key={item.id}
                  className='pt-3 first:pt-0 flex gap-3.5 items-start'
                >
                  {/* Item Image */}
                  <div className='relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted border border-border'>
                    <Image
                      fill
                      sizes='64px'
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={item.name}
                      className='object-cover'
                    />
                  </div>

                  {/* Item Details */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2'>
                      <h4 className='text-sm font-semibold text-foreground leading-snug line-clamp-2'>
                        {item.name}
                      </h4>
                      <button
                        type='button'
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Xóa món ${item.name}`}
                        className='text-muted-foreground hover:text-destructive transition-colors p-0.5'
                      >
                        <Trash2 className='size-3.5' />
                      </button>
                    </div>

                    {/* Variant / Options info */}
                    {item.variantName && (
                      <p className='text-xs text-primary font-medium mt-0.5'>
                        {item.variantName}
                      </p>
                    )}
                    {(item.size || item.flavor) && (
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {[item.size, item.flavor].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    {item.message && (
                      <p className='text-xs text-muted-foreground italic mt-0.5 line-clamp-1'>
                        &ldquo;{item.message}&rdquo;
                      </p>
                    )}

                    {/* Stepper and Price */}
                    <div className='flex items-center justify-between mt-2.5'>
                      <div className='inline-flex items-center border border-border rounded-full bg-secondary/60 p-0.5'>
                        <button
                          type='button'
                          onClick={() => updateQty(item.id, -1)}
                          aria-label='Giảm số lượng'
                          className='size-5 rounded-full flex items-center justify-center hover:bg-background text-foreground transition-colors'
                        >
                          <Minus className='size-3' />
                        </button>
                        <span className='px-2 text-xs font-semibold min-w-[20px] text-center'>
                          {item.quantity}
                        </span>
                        <button
                          type='button'
                          onClick={() => updateQty(item.id, 1)}
                          aria-label='Tăng số lượng'
                          className='size-5 rounded-full flex items-center justify-center hover:bg-background text-foreground transition-colors'
                        >
                          <Plus className='size-3' />
                        </button>
                      </div>

                      <span className='text-sm font-bold text-foreground'>
                        {formatVND(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className='pt-2 flex justify-end'>
                <button
                  type='button'
                  onClick={clearCart}
                  className='text-xs text-muted-foreground hover:text-destructive hover:underline cursor-pointer transition-colors'
                >
                  Xóa tất cả món
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer: Total & Actions */}
        {hasItems && (
          <div className='p-4 sm:p-5 border-t border-border bg-muted/30 space-y-3.5'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground font-medium'>
                Tạm tính ({cartCount} món)
              </span>
              <strong className='text-lg font-bold text-foreground'>
                {formatVND(cartTotal)}
              </strong>
            </div>

            <div className='space-y-2 pt-1'>
              <Link
                href='/checkout/info'
                onClick={() => setIsOpen(false)}
                className='flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md active:scale-[0.99]'
              >
                <span>Thanh toán ngay</span>
                <ArrowRight className='size-4' />
              </Link>

              <Link
                href='/cart'
                onClick={() => setIsOpen(false)}
                className='flex items-center justify-center w-full py-2.5 px-4 rounded-full border border-border text-foreground font-medium text-xs hover:bg-muted transition-colors'
              >
                Xem chi tiết giỏ hàng
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
