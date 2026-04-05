'use client';

import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function OrderSidebar({ step }: { step: 1 | 2 }) {
  const { cart, user } = useCart();
  const DISCOUNT_RATE: Record<string, number> = {
    silver: 0.05,
    gold: 0.1,
    platinum: 0.15,
  };
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountRate = user ? DISCOUNT_RATE[user.level] : 0;
  const discount = Math.round(subtotal * discountRate);
  const total = subtotal - discount;

  return (
    <div className='bg-card rounded-2xl border border-border/50 p-6 sticky top-24'>
      <h3 className='font-serif text-base font-semibold text-foreground mb-5'>
        Order Summary
      </h3>

      {/* Step progress */}
      <div className='flex items-center gap-2 mb-6'>
        <div
          className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`}
        />
        <div
          className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`}
        />
      </div>
      <p className='text-xs text-muted-foreground mb-5'>
        Step {step} of 2 – {step === 1 ? 'Information' : 'Payment'}
      </p>

      <div className='space-y-2.5 mb-4'>
        <div className='flex justify-between text-sm'>
          <span className='text-muted-foreground'>Subtotal</span>
          <span className='text-foreground font-medium'>
            {subtotal.toLocaleString('vi-VN')}đ
          </span>
        </div>
        {user && discount > 0 && (
          <div className='flex justify-between text-sm'>
            <span className='text-primary capitalize'>
              {user.level} discount
            </span>
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
  );
}

export default function CheckoutInfoScreen() {
  const { user, cart, setCheckoutInfo, checkoutInfo } = useCart();
  const router = useRouter();
  const [name, setName] = useState(
    checkoutInfo?.customerName || user?.name || '',
  );
  const [phone, setPhone] = useState(checkoutInfo?.customerPhone || '');
  const [email, setEmail] = useState(checkoutInfo?.customerEmail || '');
  const [address, setAddress] = useState(checkoutInfo?.customerAddress || '');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [method, setMethod] = useState<'pickup' | 'delivery'>(
    checkoutInfo?.deliveryMethod || 'pickup',
  );

  // Vietnamese phone: 0xx or +84xx, 9-11 digits
  const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

  function validatePhone(value: string): boolean {
    const cleaned = value.replace(/[\s.-]/g, '');
    if (!cleaned) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!VN_PHONE_REGEX.test(cleaned)) {
      setPhoneError('Please enter a valid Vietnamese phone number');
      return false;
    }
    setPhoneError('');
    return true;
  }

  function validateEmail(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError('');
      return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
  }

  function validateAddress(value: string, collectionMethod: 'pickup' | 'delivery'): boolean {
    if (collectionMethod === 'pickup') {
      setAddressError('');
      return true;
    }

    if (!value.trim()) {
      setAddressError('Delivery address is required');
      return false;
    }

    setAddressError('');
    return true;
  }

  const cakeItems = cart.filter((i) => i.type === 'cake');
  const pickupDates = [
    ...new Set(cakeItems.map((i) => i.pickupDate).filter(Boolean)),
  ];

  return (
    <div className='bg-background'>
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
          <Link
            href='/cart'
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4'
          >
            <ChevronLeft size={16} />
            Back to Cart
          </Link>
          <h1 className='font-serif text-3xl font-semibold text-foreground'>
            Checkout
          </h1>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10'>
        {/* Form */}
        <div className='flex-1 min-w-0 space-y-6'>
          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Full Name
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Your full name'
              className='w-full px-5 py-3.5 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors'
            />
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Phone Number
            </label>
            <input
              type='tel'
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) validatePhone(e.target.value);
              }}
              onBlur={() => validatePhone(phone)}
              placeholder='0909 xxx xxx'
              className={`w-full px-5 py-3.5 rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
                phoneError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
            {phoneError && (
              <p className='text-xs text-destructive mt-1.5'>{phoneError}</p>
            )}
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Email (Optional)
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              placeholder='you@example.com'
              className={`w-full px-5 py-3.5 rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
                emailError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
            {emailError && (
              <p className='text-xs text-destructive mt-1.5'>{emailError}</p>
            )}
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Collection Method
            </label>
            <div className='grid grid-cols-2 gap-3'>
              {(['pickup', 'delivery'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMethod(m);
                    if (addressError) {
                      validateAddress(address, m);
                    }
                  }}
                  className={`py-3.5 rounded-2xl border text-sm font-medium transition-colors ${
                    method === m
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-muted-foreground bg-card hover:border-primary/50'
                  }`}
                >
                  {m === 'pickup' ? 'Store Pick-up' : 'Delivery'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Delivery Address {method === 'delivery' ? '' : '(Optional)'}
            </label>
            <textarea
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (addressError) validateAddress(e.target.value, method);
              }}
              onBlur={() => validateAddress(address, method)}
              placeholder={
                method === 'delivery'
                  ? 'Street, ward, district, city'
                  : 'Address is optional for pickup'
              }
              rows={3}
              className={`w-full px-5 py-3.5 rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors resize-none ${
                addressError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
            {addressError && (
              <p className='text-xs text-destructive mt-1.5'>{addressError}</p>
            )}
          </div>

          {cakeItems.length > 0 && pickupDates.length > 0 && (
            <div className='bg-primary/8 border border-primary/20 rounded-2xl p-5'>
              <p className='text-xs font-semibold text-primary uppercase tracking-widest mb-3'>
                Pickup Confirmation
              </p>
              {pickupDates.map((d) => (
                <p key={d} className='text-sm text-foreground font-medium'>
                  {d}
                </p>
              ))}
              <p className='text-xs text-muted-foreground mt-2'>
                Please arrive within your selected time window.
              </p>
            </div>
          )}

          {!user && (
            <div className='rounded-2xl border border-border bg-card p-5'>
              <p className='text-sm text-muted-foreground'>
                <Link
                  href='/profile'
                  className='text-primary font-medium underline underline-offset-2'
                >
                  Create an account
                </Link>{' '}
                to collect loyalty points for this order.
              </p>
            </div>
          )}

          <button
            onClick={() => {
              if (!validatePhone(phone)) return;
              if (!validateEmail(email)) return;
              if (!validateAddress(address, method)) return;
              setCheckoutInfo({
                customerName: name.trim(),
                customerPhone: phone.replace(/[\s.-]/g, ''),
                customerEmail: email.trim() || undefined,
                customerAddress: address.trim() || undefined,
                deliveryMethod: method,
              });
              router.push('/checkout/payment');
            }}
            disabled={
              !name.trim() ||
              !phone.trim() ||
              (method === 'delivery' && !address.trim())
            }
            className='w-full py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          >
            Continue to Payment
          </button>
        </div>

        {/* Summary sidebar */}
        <aside className='w-full lg:w-80 flex-shrink-0'>
          <OrderSidebar step={1} />
        </aside>
      </div>
    </div>
  );
}
