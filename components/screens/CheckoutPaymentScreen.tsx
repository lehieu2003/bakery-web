'use client';

import {
  ChevronLeft,
  CreditCard,
  Banknote,
  Wallet,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { orderService } from '@/services/order.service';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const DISCOUNT_RATE: Record<string, number> = {
  silver: 0.05,
  gold: 0.1,
  platinum: 0.15,
};

const PAYMENT_METHODS = [
  {
    id: 'cash' as const,
    label: 'Cash on Pickup',
    icon: Banknote,
    desc: 'Pay at the counter when you collect your order',
  },
  {
    id: 'card' as const,
    label: 'Credit / Debit Card',
    icon: CreditCard,
    desc: 'Visa, Mastercard, JCB accepted',
  },
  {
    id: 'momo' as const,
    label: 'MoMo',
    icon: Wallet,
    desc: 'Pay with MoMo e-wallet',
    logo: '/images/momo-logo.png',
  },
  {
    id: 'zalopay' as const,
    label: 'ZaloPay',
    icon: Wallet,
    desc: 'Pay with ZaloPay e-wallet',
    logo: '/images/zalopay-logo.png',
  },
];

export default function CheckoutPaymentScreen() {
  const { user, cart, checkoutInfo, clearCart } = useCart();
  const router = useRouter();
  const [payMethod, setPayMethod] = useState<
    'cash' | 'card' | 'momo' | 'zalopay'
  >('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountRate = user ? DISCOUNT_RATE[user.level] : 0;
  const discount = Math.round(subtotal * discountRate);
  const total = subtotal - discount;

  async function handlePlaceOrder() {
    if (!checkoutInfo) {
      router.push('/checkout/info');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await orderService.createOrder({
        customerName: checkoutInfo.customerName,
        customerPhone: checkoutInfo.customerPhone,
        customerEmail: checkoutInfo.customerEmail,
        customerNote: checkoutInfo.customerNote,
        paymentMethod: payMethod,
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      clearCart();

      // If payment gateway returned a URL, redirect to it
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      // If payment gateway failed (e.g. MoMo/ZaloPay config issue)
      if (result.paymentError) {
        setError(result.paymentError);
        return;
      }

      // Otherwise go to success page
      router.push(`/checkout/success?order=${result.order.orderNumber}`);
    } catch {
      setError('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className='bg-background'>
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
          <Link
            href='/checkout/info'
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4'
          >
            <ChevronLeft size={16} />
            Back to Information
          </Link>
          <h1 className='font-serif text-3xl font-semibold text-foreground'>
            Payment
          </h1>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10'>
        {/* Payment method selection */}
        <div className='flex-1 min-w-0 space-y-6'>
          {user && discount > 0 && (
            <div className='flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-primary/10 border border-primary/20'>
              <span className='text-primary text-lg font-serif'>✦</span>
              <p className='text-sm font-medium text-primary'>
                {user.level.charAt(0).toUpperCase() + user.level.slice(1)}{' '}
                Member Discount Applied — saving{' '}
                {discount.toLocaleString('vi-VN')}đ on this order
              </p>
            </div>
          )}

          <div>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4'>
              Select Payment Method
            </p>
            <div className='space-y-3'>
              {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc, logo }) => (
                <button
                  key={id}
                  onClick={() => setPayMethod(id)}
                  className={`w-full flex items-center gap-5 px-5 py-4 rounded-2xl border transition-colors text-left ${
                    payMethod === id
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      payMethod === id
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {logo ? (
                      <Image
                        src={logo}
                        alt={label}
                        width={24}
                        height={24}
                        className='object-contain'
                      />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>
                  <div className='flex-1'>
                    <p
                      className={`text-sm font-semibold ${payMethod === id ? 'text-primary' : 'text-foreground'}`}
                    >
                      {label}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {desc}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      payMethod === id ? 'border-primary' : 'border-border'
                    }`}
                  >
                    {payMethod === id && (
                      <div className='w-2.5 h-2.5 rounded-full bg-primary' />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className='px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20'>
              <p className='text-sm text-destructive'>{error}</p>
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className='w-full py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {isSubmitting ? (
              <>
                <Loader2 size={17} className='animate-spin' />
                Processing...
              </>
            ) : (
              `Place Order — ${total.toLocaleString('vi-VN')}đ`
            )}
          </button>
        </div>

        {/* Summary sidebar */}
        <aside className='w-full lg:w-80 flex-shrink-0'>
          <div className='bg-card rounded-2xl border border-border/50 p-6 sticky top-24'>
            {/* Step progress */}
            <div className='flex items-center gap-2 mb-2'>
              <div className='flex-1 h-1.5 rounded-full bg-primary' />
              <div className='flex-1 h-1.5 rounded-full bg-primary' />
            </div>
            <p className='text-xs text-muted-foreground mb-6'>
              Step 2 of 2 – Payment
            </p>

            <h3 className='font-serif text-base font-semibold text-foreground mb-5'>
              Order Summary
            </h3>
            <div className='space-y-3 mb-4'>
              {cart.map((item) => (
                <div key={item.id} className='flex justify-between text-sm'>
                  <span className='text-muted-foreground truncate flex-1 mr-2'>
                    {item.name} ×{item.quantity}
                  </span>
                  <span className='text-foreground font-medium flex-shrink-0'>
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
            <div className='h-px bg-border mb-4' />
            <div className='space-y-2.5 mb-4'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span className='text-foreground font-medium'>
                  {subtotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {discount > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-primary'>Membership discount</span>
                  <span className='text-primary font-semibold'>
                    -{discount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
            </div>
            <div className='h-px bg-border mb-4' />
            <div className='flex justify-between items-center bg-secondary/70 rounded-xl px-4 py-3'>
              <span className='font-serif text-sm font-bold text-foreground'>
                Total
              </span>
              <span className='font-serif text-lg font-bold text-accent'>
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
