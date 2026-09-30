'use client';

import { ChevronLeft, Banknote, Wallet, CreditCard, Loader2, TicketPercent } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';
import { useAvailableIncentives } from '@/hooks/use-available-incentives';
import { orderService, type PreviewIncentiveResponse } from '@/services/order.service';
import type { AvailableIncentive } from '@/services/incentive-discovery.service';
import { ApiError } from '@/lib/api/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { canSubmitOrderRequest } from '@/lib/checkout-utils';

const PAYMENT_METHODS = [
  {
    id: 'COD' as const,
    label: 'Cash on Pickup',
    icon: Banknote,
    desc: 'Pay at the counter when you collect your order',
  },
  {
    id: 'MOMO' as const,
    label: 'MoMo',
    icon: Wallet,
    desc: 'Pay with MoMo e-wallet',
    logo: '/images/momo-logo.png',
  },
  {
    id: 'VNPAY' as const,
    label: 'VNPAY',
    icon: CreditCard,
    desc: 'Pay with VNPAY (QR Code, ATM Cards, Visa, MasterCard)',
  },
  {
    id: 'BANK_TRANSFER' as const,
    label: 'Bank Transfer',
    icon: Wallet,
    desc: 'Transfer to bakery account and confirm payment after checkout',
  },
];

export default function CheckoutPaymentScreen() {
  const { user, cart, checkoutInfo, clearCart } = useCart();
  const router = useRouter();
  const membershipBenefitsQuery = useMembershipBenefits({
    enabled: Boolean(user),
  });
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
    : membershipBenefitsQuery.data?.benefits.eligibility.message ??
      'Membership eligibility details are unavailable right now.';
  const [payMethod, setPayMethod] = useState<
    'COD' | 'MOMO' | 'VNPAY' | 'BANK_TRANSFER'
  >('COD');
  const [incentiveCodeInput, setIncentiveCodeInput] = useState('');
  const [selectedIncentiveCodes, setSelectedIncentiveCodes] = useState<string[]>([]);
  const [incentiveAssistMessage, setIncentiveAssistMessage] = useState('');
  const [incentiveError, setIncentiveError] = useState('');
  const [previewPricing, setPreviewPricing] =
    useState<PreviewIncentiveResponse | null>(null);
  const [isApplyingIncentive, setIsApplyingIncentive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);

  const parseablePickupDates = cart
    .map((item) => item.pickupDate)
    .filter(
      (date): date is string =>
        Boolean(date) && !Number.isNaN(new Date(date ?? '').getTime()),
    );
  const earliestPickupDate =
    parseablePickupDates.length > 0
      ? parseablePickupDates.reduce((earliest, current) =>
          new Date(current).getTime() < new Date(earliest).getTime()
            ? current
            : earliest,
        )
      : undefined;

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartContext = Array.from(
    cart.reduce((acc, item) => {
      const current = acc.get(item.productId) ?? 0;
      acc.set(item.productId, current + item.quantity);
      return acc;
    }, new Map<string, number>()),
  ).map(([productId, quantity]) => ({ productId, quantity }));
  const discountRate = user ? discountPercent / 100 : 0;
  const discount = Math.round(subtotal * discountRate);
  const baseTotal = subtotal - discount;
  const availableIncentivesQuery = useAvailableIncentives({
    subtotal,
    cart: cartContext,
    enabled: cart.length > 0,
  });
  const availableIncentives = availableIncentivesQuery.data ?? [];
  const couponDiscount = previewPricing?.couponDiscount ?? 0;
  const total = previewPricing?.total ?? baseTotal;
  const appliedIncentiveCodes =
    previewPricing?.appliedIncentives?.map((item) => item.code) ??
    selectedIncentiveCodes;
  const membershipDiscountApplied = previewPricing
    ? Math.max(previewPricing.totalDiscount - previewPricing.couponDiscount, 0)
    : discount;

  useEffect(() => {
    setPreviewPricing(null);
    setIncentiveAssistMessage('');
    setIncentiveError('');
  }, [subtotal, discount]);

  async function previewWithCodes(codes: string[]) {
    const preview = await orderService.previewIncentive({
      incentiveCodes: codes,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
    setPreviewPricing(preview);
    setSelectedIncentiveCodes(codes);
    return preview;
  }

  async function handleApplyIncentive(rawCode?: string) {
    const normalizedCode = (rawCode ?? incentiveCodeInput).trim().toUpperCase();

    if (!normalizedCode) {
      setIncentiveError('Please enter an incentive code.');
      setPreviewPricing(null);
      return;
    }

    const nextCodes = Array.from(
      new Set([...selectedIncentiveCodes, normalizedCode]),
    );
    if (nextCodes.length > 5) {
      setIncentiveError('You can apply up to 5 incentive codes.');
      return;
    }

    setIncentiveError('');
    setError('');
    setIncentiveAssistMessage('');
    setIsApplyingIncentive(true);

    try {
      const preview = await previewWithCodes(nextCodes);
      setIncentiveCodeInput('');
      setIncentiveAssistMessage(
        `Applied ${nextCodes.length} code(s). Coupon discount: -${preview.couponDiscount.toLocaleString('vi-VN')}đ.`,
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.data?.error) {
        setIncentiveError(caught.data.error);
      } else {
        setIncentiveError('Unable to apply incentive code right now.');
      }
    } finally {
      setIsApplyingIncentive(false);
    }
  }

  async function handleRemoveIncentive(code: string) {
    const nextCodes = selectedIncentiveCodes.filter((item) => item !== code);
    setIncentiveError('');
    setError('');
    setIncentiveAssistMessage('');
    setIsApplyingIncentive(true);

    try {
      if (nextCodes.length === 0) {
        setSelectedIncentiveCodes([]);
        setPreviewPricing(null);
        return;
      }

      const preview = await previewWithCodes(nextCodes);
      setIncentiveAssistMessage(
        `Updated codes. Coupon discount: -${preview.couponDiscount.toLocaleString('vi-VN')}đ.`,
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.data?.error) {
        setIncentiveError(caught.data.error);
      } else {
        setIncentiveError('Unable to update incentive codes right now.');
      }
    } finally {
      setIsApplyingIncentive(false);
    }
  }

  async function handlePlaceOrder() {
    if (
      !canSubmitOrderRequest({
        isSubmitting,
        hasInFlightRequest: isSubmittingRef.current,
      })
    ) {
      return;
    }

    if (!checkoutInfo) {
      router.push('/checkout/info');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError('');
    setIncentiveAssistMessage('');
    setIncentiveError('');

    try {
      const result = await orderService.createOrder({
        customerName: checkoutInfo.customerName,
        customerPhone: checkoutInfo.customerPhone,
        customerEmail: checkoutInfo.customerEmail,
        customerAddress: checkoutInfo.customerAddress,
        paymentMethod: payMethod,
        incentiveCodes:
          selectedIncentiveCodes.length > 0 ? selectedIncentiveCodes : undefined,
        pickupDate:
          checkoutInfo.deliveryMethod === 'pickup'
            ? earliestPickupDate
            : undefined,
        addressId: checkoutInfo.addressId,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          message: item.message,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      // If payment gateway returned a URL, redirect to payment gateway
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      // If payment gateway failed (e.g. MoMo/VNPay config issue)
      if (result.paymentError) {
        setError(result.paymentError);
        return;
      }

      // Cash payment — clear cart and go to success page
      clearCart();
      router.push(`/checkout/success?order=${result.order.orderNumber}`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.data?.error) {
        setError(caught.data.error);
      } else {
        setError('Failed to place order. Please try again.');
      }
    } finally {
      isSubmittingRef.current = false;
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
          {user && membershipDiscountApplied > 0 && (
            <div className='flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-primary/10 border border-primary/20'>
              <span className='text-primary text-lg font-serif'>✦</span>
              <p className='text-sm font-medium text-primary'>
                {memberLabel}{' '}
                Member Discount Applied — saving{' '}
                {membershipDiscountApplied.toLocaleString('vi-VN')}đ on this order
              </p>
              <p className='text-xs text-primary' aria-live='polite'>
                Current points: {membershipPoints.toLocaleString('vi-VN')}.{' '}
                {eligibilityMessage}
              </p>
            </div>
          )}

          <div className='rounded-2xl border border-border bg-card px-5 py-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <TicketPercent size={16} className='text-primary' />
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                Incentive Code
              </p>
            </div>
            <input
              type='text'
              value={incentiveCodeInput}
              onChange={(e) => {
                setIncentiveCodeInput(e.target.value.toUpperCase());
              }}
              placeholder='Enter incentive code (optional)'
              className='w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors'
            />
            <button
              type='button'
              onClick={() => {
                void handleApplyIncentive();
              }}
              disabled={isApplyingIncentive || cart.length === 0}
              className='w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {isApplyingIncentive ? (
                <>
                  <Loader2 size={15} className='animate-spin' />
                  Applying...
                </>
              ) : (
                'Apply code'
              )}
            </button>
            {selectedIncentiveCodes.length > 0 && (
              <div className='space-y-2'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                  Applied codes
                </p>
                <div className='flex flex-wrap gap-2'>
                  {selectedIncentiveCodes.map((code) => (
                    <button
                      key={code}
                      type='button'
                      onClick={() => {
                        void handleRemoveIncentive(code);
                      }}
                      className='text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors'
                    >
                      {code} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availableIncentivesQuery.isLoading && (
              <p className='text-xs text-muted-foreground' aria-live='polite'>
                Loading available offers...
              </p>
            )}
            {!availableIncentivesQuery.isLoading && availableIncentivesQuery.isError && (
              <p className='text-xs text-muted-foreground' aria-live='polite'>
                Unable to load offers right now. You can still enter a code manually.
              </p>
            )}
            {!availableIncentivesQuery.isLoading &&
              !availableIncentivesQuery.isError &&
              availableIncentives.length === 0 && (
                <p className='text-xs text-muted-foreground' aria-live='polite'>
                  No available offers for this cart right now.
                </p>
              )}
            {!availableIncentivesQuery.isLoading &&
              !availableIncentivesQuery.isError &&
              availableIncentives.length > 0 && (
                <div className='space-y-2'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                    Available offers
                  </p>
                  <ul className='space-y-2'>
                    {availableIncentives.map((offer: AvailableIncentive) => {
                      const valueLabel =
                        offer.type === 'PERCENTAGE'
                          ? `${offer.value}% off`
                          : `-${offer.value.toLocaleString('vi-VN')}đ`;
                      const minOrderLabel = offer.minOrder
                        ? `Min ${offer.minOrder.toLocaleString('vi-VN')}đ`
                        : 'No minimum order';
                      const maxDiscountLabel = offer.maxDiscount
                        ? `, max ${offer.maxDiscount.toLocaleString('vi-VN')}đ`
                        : '';
                      const expiresLabel = new Date(offer.endAt).toLocaleDateString('vi-VN');

                      return (
                        <li
                          key={offer.code}
                          className='rounded-xl border border-border/80 bg-background px-3 py-2 flex items-start justify-between gap-3'
                        >
                          <div>
                            <p className='text-sm font-semibold text-foreground'>{offer.code}</p>
                            <p className='text-xs text-muted-foreground'>
                              {valueLabel} · {minOrderLabel}
                              {maxDiscountLabel} · Ends {expiresLabel}
                            </p>
                          </div>
                          <button
                            type='button'
                            onClick={() => {
                              void handleApplyIncentive(offer.code);
                            }}
                            disabled={selectedIncentiveCodes.includes(offer.code)}
                            className='text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            {selectedIncentiveCodes.includes(offer.code)
                              ? 'Added'
                              : 'Apply'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            {incentiveError && (
              <p className='text-xs text-destructive' aria-live='polite'>
                {incentiveError}
              </p>
            )}
            {incentiveAssistMessage && (
              <p className='text-xs text-primary' aria-live='polite'>
                {incentiveAssistMessage}
              </p>
            )}
            <p className='text-xs text-muted-foreground' aria-live='polite'>
              You can apply multiple incentive codes. Final eligibility and totals are validated by server.
            </p>
          </div>

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
            <div
              className='px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20'
              aria-live='polite'
            >
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
              {membershipDiscountApplied > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-primary'>
                    {memberLabel} discount ({discountPercent}%)
                  </span>
                  <span className='text-primary font-semibold'>
                    -{membershipDiscountApplied.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-primary'>Coupon discount</span>
                  <span className='text-primary font-semibold'>
                    -{couponDiscount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              {appliedIncentiveCodes.length > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Incentive codes</span>
                  <span className='text-foreground font-medium text-right'>
                    {appliedIncentiveCodes.join(', ')}
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
