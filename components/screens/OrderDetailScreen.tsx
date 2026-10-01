'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import { orderService } from '@/services/order.service';
import {
  getOrderStatusPresentation,
  getPaymentStatusPresentation,
} from '@/lib/orders/presentation';

function formatVnd(amount: number) {
  return `${Number(amount).toLocaleString('vi-VN')}đ`;
}

export default function OrderDetailScreen({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const orderQuery = useQuery({
    queryKey: ['orders', 'detail', orderNumber],
    queryFn: () => orderService.getOrderByNumber(orderNumber),
    retry: false,
  });

  if (orderQuery.isLoading) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='max-w-3xl mx-auto px-6 py-10 space-y-4'>
          <div className='h-8 w-48 bg-secondary rounded animate-pulse' />
          <div className='h-40 bg-secondary rounded-2xl animate-pulse' />
        </div>
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-destructive mb-4'>Order not found</p>
          <Link
            href='/profile'
            className='text-primary hover:underline text-sm font-medium'
          >
            Back to Order History
          </Link>
        </div>
      </div>
    );
  }

  const order = orderQuery.data;
  const status = getOrderStatusPresentation(order.status);
  const payment = getPaymentStatusPresentation(
    order.payment?.status ?? null,
    order.paymentMethod,
  );

  return (
    <div className='min-h-screen bg-background'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <Link
          href='/profile'
          className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6'
        >
          <ArrowLeft size={16} />
          Back to Order History
        </Link>

        <div className='flex items-center justify-between mb-6'>
          <h1 className='font-serif text-2xl font-bold text-foreground'>
            #{order.orderNumber}
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.tone === 'success' ? 'bg-green-50 text-green-700 border-green-200' : status.tone === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : status.tone === 'danger' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-secondary text-foreground border-border'}`}
          >
            {status.label}
          </span>
        </div>

        <div className='bg-card rounded-2xl border border-border/50 p-6 mb-6'>
          <h2 className='font-semibold text-foreground mb-4 flex items-center gap-2'>
            <ReceiptText size={18} />
            Items
          </h2>
          <div className='space-y-3'>
            {order.orderItems.map((item) => (
              <div
                key={item.id}
                className='flex items-start justify-between gap-4 text-sm'
              >
                <div>
                  <p className='text-foreground'>
                    {item.name} × {item.quantity}
                  </p>
                  {item.message ? (
                    <p className='italic text-muted-foreground mt-0.5'>
                      “{item.message}”
                    </p>
                  ) : null}
                </div>
                <p className='text-foreground whitespace-nowrap'>
                  {formatVnd(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className='bg-card rounded-2xl border border-border/50 p-6 mb-6 text-sm'>
          <div className='flex justify-between py-1'>
            <span className='text-muted-foreground'>Subtotal</span>
            <span>{formatVnd(order.subtotal)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className='flex justify-between py-1'>
              <span className='text-muted-foreground'>Delivery fee</span>
              <span>{formatVnd(order.deliveryFee)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className='flex justify-between py-1'>
              <span className='text-muted-foreground'>Discount</span>
              <span className='text-green-700'>
                -{formatVnd(order.discount)}
              </span>
            </div>
          )}
          <div className='flex justify-between py-2 mt-2 border-t border-border font-semibold'>
            <span>Total</span>
            <span>{formatVnd(order.total)}</span>
          </div>
        </div>

        <div className='bg-card rounded-2xl border border-border/50 p-6 text-sm space-y-2'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Payment</span>
            <span>
              {order.paymentMethod ?? '—'} · {payment.label}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Customer</span>
            <span>
              {order.customerName} · {order.customerPhone}
            </span>
          </div>
          {order.customerAddress && (
            <div className='flex justify-between gap-6'>
              <span className='text-muted-foreground'>Address</span>
              <span className='text-right'>{order.customerAddress}</span>
            </div>
          )}
          {order.pickupDate && (
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Pickup date</span>
              <span>
                {new Date(order.pickupDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
          )}
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Placed on</span>
            <span>
              {new Date(order.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
