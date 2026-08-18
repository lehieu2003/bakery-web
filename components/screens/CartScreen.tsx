'use client';

import Image from 'next/image';
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartScreen() {
  const { cart, user, removeFromCart, updateQty } = useCart();
  const router = useRouter();
  const membershipBenefitsQuery = useMembershipBenefits({
    enabled: Boolean(user),
  });

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountPercent =
    membershipBenefitsQuery.data?.benefits.currentTier.discountPercent ?? 0;
  const memberLabel =
    membershipBenefitsQuery.data?.benefits.currentTier.label ??
    user?.level ??
    'Member';
  const membershipPoints =
    membershipBenefitsQuery.data?.user.points ?? user?.points ?? 0;
  const eligibilityMessage = membershipBenefitsQuery.isLoading
    ? 'Checking membership benefit eligibility...'
    : (membershipBenefitsQuery.data?.benefits.eligibility.message ??
      'Membership eligibility details are unavailable right now.');
  const discountRate = user ? discountPercent / 100 : 0;
  const discount = Math.round(subtotal * discountRate);
  const total = subtotal - discount;

  return (
    <div className='bg-background'>
      {/* Page header */}
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
          <Link
            href='/'
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4'
          >
            <ChevronLeft size={16} />
            Continue Shopping
          </Link>
          <h1 className='font-serif text-3xl font-semibold text-foreground'>
            My Cart
          </h1>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
        {cart.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-24 gap-6 text-center'>
            <div className='w-20 h-20 rounded-full bg-secondary flex items-center justify-center'>
              <ShoppingBag size={28} className='text-muted-foreground' />
            </div>
            <div>
              <p className='font-serif text-xl font-semibold text-foreground mb-1'>
                Your cart is empty
              </p>
              <p className='text-sm text-muted-foreground'>
                Add some cakes or ingredients to get started.
              </p>
            </div>
            <Link
              href='/'
              className='px-8 py-3 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors'
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className='flex flex-col lg:flex-row gap-10'>
            {/* Cart items */}
            <div className='flex-1 min-w-0'>
              <div className='space-y-4'>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className='bg-card rounded-2xl border border-border/50 p-5 flex gap-5'
                  >
                    <div className='relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-secondary'>
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className='object-cover'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <p className='font-sans text-base font-semibold text-foreground'>
                            {item.name}
                          </p>
                          {item.variantName && (
                            <p className='text-sm text-muted-foreground mt-0.5'>
                              {item.variantName}
                            </p>
                          )}
                          {item.size && !item.variantName && (
                            <p className='text-sm text-muted-foreground mt-0.5'>
                              {item.size} · {item.flavor}
                            </p>
                          )}
                          {item.pickupDate && (
                            <p className='text-sm text-muted-foreground'>
                              Pickup: {item.pickupDate}
                            </p>
                          )}
                          {item.message && (
                            <p className='text-sm text-muted-foreground italic mt-0.5'>
                              &quot;{item.message}&quot;
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className='p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-secondary flex-shrink-0'
                          aria-label='Remove item'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className='flex items-center justify-between mt-4'>
                        <p className='font-sans text-lg font-bold text-accent'>
                          {(item.price * item.quantity).toLocaleString('vi-VN')}
                          đ
                        </p>
                        <div className='flex items-center gap-3 border border-border rounded-full px-3 py-1.5'>
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className='text-muted-foreground hover:text-foreground transition-colors'
                            aria-label='Decrease quantity'
                          >
                            <Minus size={14} />
                          </button>
                          <span className='text-sm font-semibold text-foreground w-5 text-center'>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className='text-muted-foreground hover:text-foreground transition-colors'
                            aria-label='Increase quantity'
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky order summary */}
            <aside className='w-full lg:w-80 flex-shrink-0'>
              <div className='sticky top-24'>
                <div className='bg-card rounded-2xl border border-border/50 p-6'>
                  <h2 className='font-serif text-xl font-semibold text-foreground mb-6'>
                    Order Summary
                  </h2>
                  <div className='space-y-3 mb-4'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>
                        Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)}{' '}
                        items)
                      </span>
                      <span className='text-sm text-foreground font-medium'>
                        {subtotal.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    {user && discount > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-primary capitalize'>
                          {memberLabel} Member ({discountPercent}% off)
                        </span>
                        <span className='text-sm text-primary font-semibold'>
                          -{discount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}
                    {user && (
                      <div
                        className='rounded-xl bg-secondary/70 px-3 py-2'
                        aria-live='polite'
                      >
                        <p className='text-xs text-muted-foreground'>
                          Current points:{' '}
                          {membershipPoints.toLocaleString('vi-VN')}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {eligibilityMessage}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className='h-px bg-border mb-4' />
                  <div className='flex justify-between items-center bg-secondary/70 rounded-xl px-4 py-3 mb-6'>
                    <span className='font-serif text-base font-bold text-foreground'>
                      Total
                    </span>
                    <span className='font-serif text-xl font-bold text-accent'>
                      {total.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  {!user && (
                    <p className='text-xs text-muted-foreground text-center mb-4'>
                      <Link
                        href='/profile'
                        className='text-primary underline underline-offset-2 font-medium'
                      >
                        Sign in
                      </Link>{' '}
                      to apply membership savings.
                    </p>
                  )}

                  <button
                    onClick={() => router.push('/checkout/info')}
                    className='w-full py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors'
                  >
                    Thanh toán ngày
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
