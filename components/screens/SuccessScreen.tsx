'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useOrders } from '@/hooks/use-orders';
import { useAuth } from '@/providers/auth-provider';
import type { Order } from '@/types/api.types';
import {
  getConfirmationTitle,
  getOrderStatusPresentation,
  getPaymentStatusPresentation,
  toVietnameseStatusLabel,
  toneToBadgeClass,
} from '@/lib/orders/presentation';

interface SuccessScreenProps {
  orderNumber: string;
}

export default function SuccessScreen({ orderNumber }: SuccessScreenProps) {
  const { user, isAuthenticated } = useAuth();
  const {
    data: orders = [],
    isLoading,
    isError,
  } = useOrders({ enabled: isAuthenticated });
  const matchedOrder = useMemo(
    () =>
      ((isAuthenticated ? orders : []) as Order[]).find(
        (order: Order) => order.orderNumber === orderNumber,
      ),
    [isAuthenticated, orders, orderNumber],
  );
  const orderStatus = matchedOrder
    ? getOrderStatusPresentation(matchedOrder.status)
    : null;
  const paymentStatus = matchedOrder
    ? getPaymentStatusPresentation(
        matchedOrder.payment?.status,
        matchedOrder.paymentMethod,
        matchedOrder.status,
      )
    : null;
  const confirmationTitle = getConfirmationTitle({
    isAuthenticated,
    orderStatusLabel: orderStatus?.label,
    paymentStatusLabel: paymentStatus?.label,
  });

  return (
    <div className='bg-background min-h-[70vh] flex items-center justify-center px-6 py-16'>
      <div className='w-full max-w-lg mx-auto'>
        {/* Check icon */}
        <div className='flex justify-center mb-8'>
          <div className='relative'>
            <div className='w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center animate-scale-in'>
              <div className='w-14 h-14 rounded-full bg-primary flex items-center justify-center'>
                <svg
                  width='26'
                  height='26'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='white'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <polyline points='20 6 9 17 4 12' />
                </svg>
              </div>
            </div>
            <div
              className='absolute inset-0 w-20 h-20 rounded-full border border-primary/15 scale-125 animate-ping'
              style={{ animationDuration: '2.2s' }}
            />
          </div>
        </div>

        <div className='text-center mb-8'>
          <h1 className='font-serif text-3xl font-semibold text-foreground mb-2'>
            {confirmationTitle}
          </h1>
          <p className='text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto'>
            {matchedOrder
              ? 'Chi tiết đơn được đồng bộ từ lịch sử tài khoản của bạn.'
              : 'Đơn hàng đã được ghi nhận. Trạng thái có thể cập nhật sau khi cổng thanh toán xác nhận.'}
          </p>
        </div>

        {/* Order card */}
        <div className='bg-card rounded-2xl border border-border/50 p-6 mb-4'>
          <div className='flex justify-between items-center pb-4 border-b border-border'>
            <span className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
              Mã đơn hàng
            </span>
            <span className='font-serif text-base font-semibold text-foreground'>
              #{orderNumber}
            </span>
          </div>

          <div className='pt-4 space-y-3'>
            {isAuthenticated && isLoading && (
              <p className='text-xs text-muted-foreground'>
                Đang đồng bộ trạng thái mới nhất...
              </p>
            )}

            {matchedOrder && orderStatus && paymentStatus && (
              <>
                <div className='flex justify-between items-center'>
                  <span className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                    Trạng thái đơn
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneToBadgeClass(orderStatus.tone)}`}
                  >
                    {toVietnameseStatusLabel(orderStatus.label)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                    Thanh toán
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneToBadgeClass(paymentStatus.tone)}`}
                  >
                    {toVietnameseStatusLabel(paymentStatus.label)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                    Tổng cộng
                  </span>
                  <span className='text-sm font-semibold text-foreground'>
                    {matchedOrder.total.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </>
            )}

            {!isAuthenticated && (
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Đặt hàng không cần tài khoản: lưu lại mã đơn hàng để được
                hỗ trợ. Theo dõi lịch sử đơn sau khi đăng nhập.
              </p>
            )}

            {isAuthenticated && !isLoading && !matchedOrder && (
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Đơn hàng đang được chốt lại. Mở Lịch sử đơn hàng để xem
                cập nhật trực tiếp.
              </p>
            )}

            {isError && (
              <p className='text-xs text-amber-700'>
                Tạm thời không đồng bộ được trạng thái đơn. Bạn vẫn có thể
                xem trong Lịch sử đơn hàng.
              </p>
            )}
          </div>
        </div>

        {/* Loyalty note */}
        {user && matchedOrder && (
          <div className='bg-primary/8 border border-primary/20 rounded-2xl p-5 mb-4'>
            <div className='flex items-center justify-between mb-2'>
              <p className='font-serif text-sm font-semibold text-primary'>
                Tích điểm
              </p>
              <span className='text-xs text-primary uppercase tracking-wider font-semibold'>
                {user.memberLevel ?? 'SILVER'}
              </span>
            </div>
            <p className='text-xs text-muted-foreground'>
              Điểm tích luỹ: {(user.points ?? 0).toLocaleString()}.
            </p>
          </div>
        )}

        {/* Guest nudge */}
        {!user && (
          <div className='bg-card border border-border rounded-2xl p-5 mb-4'>
            <p className='text-sm text-muted-foreground leading-relaxed text-center'>
              <Link
                href='/profile'
                className='text-primary font-medium underline underline-offset-2'
              >
                Tạo tài khoản
              </Link>{' '}
              để bắt đầu tích điểm từ đơn hàng tiếp theo.
            </p>
          </div>
        )}

        <div className='flex flex-col sm:flex-row gap-3'>
          <Link
            href='/'
            className='flex-1 py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors text-center'
          >
            Về trang chủ
          </Link>
          <Link
            href='/profile'
            className='flex-1 py-4 border border-border text-foreground rounded-full font-medium text-sm hover:bg-secondary transition-colors text-center'
          >
            Xem lịch sử đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
