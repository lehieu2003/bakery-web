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
import {
  canSubmitOrderRequest,
  shouldKeepIdempotencyKey,
} from '@/lib/checkout-utils';

const PAYMENT_METHODS = [
  {
    id: 'COD' as const,
    label: 'Tiền mặt khi nhận',
    icon: Banknote,
    desc: 'Thanh toán bằng tiền mặt khi nhận bánh',
  },
  {
    id: 'MOMO' as const,
    label: 'MoMo',
    icon: Wallet,
    desc: 'Thanh toán qua ví điện tử MoMo',
    logo: '/images/momo-logo.png',
  },
  {
    id: 'VNPAY' as const,
    label: 'VNPAY',
    icon: CreditCard,
    desc: 'Thanh toán qua VNPAY (QR code, thẻ ATM, Visa, MasterCard)',
  },
  {
    id: 'BANK_TRANSFER' as const,
    label: 'Chuyển khoản ngân hàng',
    icon: Wallet,
    desc: 'Chuyển khoản và xác nhận thanh toán sau khi đặt bánh',
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
    'thành viên';
  const membershipPoints =
    membershipBenefitsQuery.data?.user.points ?? user?.points ?? 0;
  const eligibilityMessage = membershipBenefitsQuery.isLoading
    ? 'Đang kiểm tra ưu đãi thành viên...'
    : membershipBenefitsQuery.data?.benefits.eligibility.message ??
      'Tạm thời không hiển thị được ưu đãi thành viên.';
  const [payMethod, setPayMethod] = useState<
    'COD' | 'MOMO' | 'VNPAY' | 'BANK_TRANSFER'
  >('COD');
  const [incentiveCodeInput, setIncentiveCodeInput] = useState('');
  const [selectedIncentiveCodes, setSelectedIncentiveCodes] = useState<string[]>([]);
  const [incentiveAssistMessage, setIncentiveAssistMessage] = useState('');
  const [incentiveError, setIncentiveError] = useState('');
  const [previewPricing, setPreviewPricing] =
    useState<PreviewIncentiveResponse | null>(null);
  // Set when the fee-aware preview request fails so ordering can still
  // proceed instead of blocking on an unavailable endpoint.
  const [isFeePreviewUnavailable, setIsFeePreviewUnavailable] = useState(false);
  const [isApplyingIncentive, setIsApplyingIncentive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  /** Idempotency-Key of the checkout attempt in flight; see shouldKeepIdempotencyKey. */
  const checkoutKeyRef = useRef<string | null>(null);

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
  const deliveryMethod = checkoutInfo?.deliveryMethod;
  // Same rule as the API routes: only an explicit 'delivery' pays the fee.
  const isDelivery = deliveryMethod === 'delivery';
  const deliveryFee = isDelivery ? (previewPricing?.deliveryFee ?? 0) : 0;
  const availableIncentivesQuery = useAvailableIncentives({
    subtotal,
    cart: cartContext,
    enabled: cart.length > 0,
  });
  const availableIncentives = availableIncentivesQuery.data ?? [];
  const couponDiscount = previewPricing?.couponDiscount ?? 0;
  const total = previewPricing?.total ?? baseTotal;
  // The charged total must never exceed the displayed total: every order
  // waits for the fee-aware preview before enabling Place Order.
  const isFeePreviewPending =
    previewPricing === null && !isFeePreviewUnavailable;
  const appliedIncentiveCodes =
    previewPricing?.appliedIncentives?.map((item) => item.code) ??
    selectedIncentiveCodes;
  const membershipDiscountApplied = previewPricing
    ? Math.max(previewPricing.totalDiscount - previewPricing.couponDiscount, 0)
    : discount;
  // Client auth state may lag the session the backend sees (stale cookies),
  // so derive the displayed percent from the authoritative preview amounts.
  const membershipDiscountPercentShown =
    previewPricing && subtotal > 0
      ? Math.round((membershipDiscountApplied / subtotal) * 100)
      : discountPercent;

  useEffect(() => {
    setPreviewPricing(null);
    setIncentiveAssistMessage('');
    setIncentiveError('');
  }, [subtotal, discount]);

  // The preview is the authoritative price for EVERY order: the backend can
  // apply a membership discount server-side even when the client-side auth
  // state still says guest, so the displayed total must always come from it.
  useEffect(() => {
    if (cart.length === 0 || previewPricing || isFeePreviewUnavailable) return;
    let cancelled = false;
    orderService
      .previewIncentive({
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        deliveryMethod,
      })
      .then((preview) => {
        if (!cancelled) setPreviewPricing(preview);
      })
      .catch(() => {
        if (!cancelled) setIsFeePreviewUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    subtotal,
    previewPricing,
    isFeePreviewUnavailable,
    deliveryMethod,
    cart,
  ]);

  async function previewWithCodes(codes: string[]) {
    const preview = await orderService.previewIncentive({
      incentiveCodes: codes,
      items: cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      deliveryMethod,
    });
    setPreviewPricing(preview);
    setSelectedIncentiveCodes(codes);
    return preview;
  }

  async function handleApplyIncentive(rawCode?: string) {
    const normalizedCode = (rawCode ?? incentiveCodeInput).trim().toUpperCase();

    if (!normalizedCode) {
      setIncentiveError('Vui lòng nhập mã giảm giá.');
      setPreviewPricing(null);
      return;
    }

    const nextCodes = Array.from(
      new Set([...selectedIncentiveCodes, normalizedCode]),
    );
    if (nextCodes.length > 5) {
      setIncentiveError('Bạn chỉ có thể dùng tối đa 5 mã giảm giá.');
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
        `Đã áp dụng ${nextCodes.length} mã. Giảm giá: -${preview.couponDiscount.toLocaleString('vi-VN')}đ.`,
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.data?.error) {
        setIncentiveError(caught.data.error);
      } else {
        setIncentiveError('Tạm thời không áp dụng được mã. Vui lòng thử lại.');
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
        `Đã cập nhật mã. Giảm giá: -${preview.couponDiscount.toLocaleString('vi-VN')}đ.`,
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.data?.error) {
        setIncentiveError(caught.data.error);
      } else {
        setIncentiveError('Tạm thời không cập nhật được mã. Vui lòng thử lại.');
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
    const idempotencyKey = (checkoutKeyRef.current ??= crypto.randomUUID());

    try {
      const result = await orderService.createOrder({
        customerName: checkoutInfo.customerName,
        customerPhone: checkoutInfo.customerPhone,
        customerEmail: checkoutInfo.customerEmail,
        customerAddress: checkoutInfo.customerAddress,
        paymentMethod: payMethod,
        deliveryMethod,
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
      }, { idempotencyKey });
      checkoutKeyRef.current = null;

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
      if (!shouldKeepIdempotencyKey(caught instanceof ApiError)) {
        checkoutKeyRef.current = null;
      }
      if (caught instanceof ApiError && caught.data?.error) {
        setError(caught.data.error);
      } else {
        setError('Đặt bánh chưa thành công. Vui lòng thử lại.');
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
            Về bước thông tin
          </Link>
          <h1 className='font-serif text-3xl font-semibold text-foreground'>
            Thanh toán
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
                Ưu đãi hạng {memberLabel} — tiết kiệm{' '}
                {membershipDiscountApplied.toLocaleString('vi-VN')}đ cho đơn này
              </p>
              <p className='text-xs text-primary' aria-live='polite'>
                Điểm tích luỹ: {membershipPoints.toLocaleString('vi-VN')}.{' '}
                {eligibilityMessage}
              </p>
            </div>
          )}

          <div className='rounded-2xl border border-border bg-card px-5 py-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <TicketPercent size={16} className='text-primary' />
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                Mã giảm giá
              </p>
            </div>
            <input
              type='text'
              value={incentiveCodeInput}
              onChange={(e) => {
                setIncentiveCodeInput(e.target.value.toUpperCase());
              }}
              placeholder='Nhập mã giảm giá (không bắt buộc)'
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
                  Đang áp dụng...
                </>
              ) : (
                'Áp dụng'
              )}
            </button>
            {selectedIncentiveCodes.length > 0 && (
              <div className='space-y-2'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                  Mã đã áp dụng
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
                Đang tải ưu đãi...
              </p>
            )}
            {!availableIncentivesQuery.isLoading && availableIncentivesQuery.isError && (
              <p className='text-xs text-muted-foreground' aria-live='polite'>
                Tạm thời không tải được ưu đãi. Bạn vẫn có thể nhập mã thủ công.
              </p>
            )}
            {!availableIncentivesQuery.isLoading &&
              !availableIncentivesQuery.isError &&
              availableIncentives.length === 0 && (
                <p className='text-xs text-muted-foreground' aria-live='polite'>
                  Chưa có ưu đãi phù hợp với giỏ hàng này.
                </p>
              )}
            {!availableIncentivesQuery.isLoading &&
              !availableIncentivesQuery.isError &&
              availableIncentives.length > 0 && (
                <div className='space-y-2'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                    Ưu đãi có sẵn
                  </p>
                  <ul className='space-y-2'>
                    {availableIncentives.map((offer: AvailableIncentive) => {
                      const valueLabel =
                        offer.type === 'PERCENTAGE'
                          ? `giảm ${offer.value}%`
                          : `-${offer.value.toLocaleString('vi-VN')}đ`;
                      const minOrderLabel = offer.minOrder
                        ? `Đơn tối thiểu ${offer.minOrder.toLocaleString('vi-VN')}đ`
                        : 'Không giới hạn';
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
                              {maxDiscountLabel} · HSD {expiresLabel}
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
                              ? 'Đã áp dụng'
                              : 'Áp dụng'}
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
              Bạn có thể dùng nhiều mã cùng lúc. Điều kiện và tổng tiền cuối cùng được hệ thống xác nhận.
            </p>
          </div>

          <div>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4'>
              Chọn phương thức thanh toán
            </p>
            <div className='space-y-3'>
              {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc, logo }) => {
                // COD wording depends on how the order is fulfilled.
                const isCod = id === 'COD';
                const displayLabel = isCod
                  ? isDelivery
                    ? 'Tiền mặt khi giao'
                    : 'Tiền mặt tại cửa hàng'
                  : label;
                const displayDesc = isCod
                  ? isDelivery
                    ? 'Thanh toán bằng tiền mặt khi nhận bánh'
                    : 'Thanh toán bằng tiền mặt tại cửa hàng'
                  : desc;
                return (
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
                      {displayLabel}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {displayDesc}
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
                );
              })}
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
            disabled={isSubmitting || cart.length === 0 || isFeePreviewPending}
            className='w-full py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {isSubmitting ? (
              <>
                <Loader2 size={17} className='animate-spin' />
                Đang xử lý...
              </>
            ) : (
              `Đặt bánh — ${total.toLocaleString('vi-VN')}đ`
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
              Bước 2/2 – Thanh toán
            </p>

            <h3 className='font-serif text-base font-semibold text-foreground mb-5'>
              Tóm tắt đơn hàng
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
                <span className='text-muted-foreground'>Tạm tính</span>
                <span className='text-foreground font-medium'>
                  {subtotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {membershipDiscountApplied > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-primary'>
                    Ưu đãi hạng {memberLabel} ({membershipDiscountPercentShown}%)
                  </span>
                  <span className='text-primary font-semibold'>
                    -{membershipDiscountApplied.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-primary'>Mã giảm giá</span>
                  <span className='text-primary font-semibold'>
                    -{couponDiscount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              {appliedIncentiveCodes.length > 0 && (
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Mã đã dùng</span>
                  <span className='text-foreground font-medium text-right'>
                    {appliedIncentiveCodes.join(', ')}
                  </span>
                </div>
              )}
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Phí giao hàng</span>
                <span className='text-foreground font-medium'>
                  {deliveryFee > 0
                    ? `${deliveryFee.toLocaleString('vi-VN')}đ`
                    : isDelivery
                      ? 'Miễn phí'
                      : '0đ'}
                </span>
              </div>
            </div>
            <div className='h-px bg-border mb-4' />
            <div className='flex justify-between items-center bg-secondary/70 rounded-xl px-4 py-3'>
              <span className='font-serif text-sm font-bold text-foreground'>
                Tổng cộng
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
