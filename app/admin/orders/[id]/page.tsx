'use client';

import { use, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Printer, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  mockOrders,
  Order,
  OrderStatus,
  formatVND,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/admin-data';
import { cn } from '@/lib/utils';

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(
    mockOrders.find((o) => o.id === id) ?? null,
  );
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!order) {
    return (
      <AdminShell title='Order Not Found'>
        <div className='text-center py-20'>
          <p className='text-muted-foreground text-sm'>Order not found.</p>
          <Link href='/admin/orders'>
            <Button variant='outline' size='sm' className='mt-4 text-xs'>
              Back to Orders
            </Button>
          </Link>
        </div>
      </AdminShell>
    );
  }

  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  const handleUpdateStatus = () => {
    if (selectedStatus) {
      setOrder((prev) => prev && { ...prev, status: selectedStatus as OrderStatus });
      setSelectedStatus('');
    }
  };

  return (
    <AdminShell title={order.orderCode}>
      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <Link href='/admin/orders'>
          <button className='p-1.5 rounded-lg hover:bg-muted text-muted-foreground'>
            <ChevronLeft size={16} />
          </button>
        </Link>
        <div className='flex-1'>
          <div className='flex items-center gap-3 flex-wrap'>
            <h1 className='font-serif text-xl font-semibold text-foreground'>
              {order.orderCode}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ORDER_STATUS_COLORS[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>Created {order.createdAt}</p>
        </div>
        <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5 hidden sm:flex'>
          <Printer size={12} />
          Print
        </Button>
      </div>

      <div className='grid lg:grid-cols-3 gap-4'>
        {/* Left column */}
        <div className='lg:col-span-2 space-y-4'>
          {/* Items */}
          <div className='bg-card rounded-xl border border-border shadow-sm'>
            <div className='px-5 py-4 border-b border-border'>
              <p className='text-sm font-semibold text-foreground'>
                Items ({order.items.length})
              </p>
            </div>
            <div className='divide-y divide-border'>
              {order.items.map((item) => (
                <div key={item.id} className='flex gap-3 px-5 py-4'>
                  <div className='w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted'>
                    <Image
                      src={item.thumbnail}
                      alt={item.name}
                      width={48}
                      height={48}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-foreground'>{item.name}</p>
                    <p className='text-[10px] text-muted-foreground mt-0.5'>
                      Qty: {item.quantity} · {formatVND(item.unitPrice)} each
                    </p>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <div className='flex flex-wrap gap-1 mt-1.5'>
                        {Object.entries(item.options).map(([k, v]) => (
                          <span
                            key={k}
                            className='inline-flex items-center px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground'
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className='text-xs font-semibold text-foreground shrink-0'>
                    {formatVND(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Fulfillment */}
          <div className='bg-card rounded-xl border border-border shadow-sm'>
            <div className='px-5 py-4 border-b border-border'>
              <p className='text-sm font-semibold text-foreground'>Customer & Fulfillment</p>
            </div>
            <div className='px-5 py-4 grid sm:grid-cols-2 gap-4'>
              <div className='space-y-3'>
                <div>
                  <p className='text-[10px] text-muted-foreground uppercase tracking-wide font-medium'>
                    Customer
                  </p>
                  <p className='text-xs font-medium text-foreground mt-0.5'>
                    {order.customerName}
                  </p>
                  <p className='text-xs text-muted-foreground'>{order.phone}</p>
                </div>
                {order.note && (
                  <div>
                    <p className='text-[10px] text-muted-foreground uppercase tracking-wide font-medium'>
                      Note
                    </p>
                    <p className='text-xs text-foreground mt-0.5'>{order.note}</p>
                  </div>
                )}
              </div>
              <div className='space-y-3'>
                <div>
                  <p className='text-[10px] text-muted-foreground uppercase tracking-wide font-medium'>
                    Fulfillment
                  </p>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1',
                      order.fulfillment === 'PICKUP'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200',
                    )}
                  >
                    {order.fulfillment}
                  </span>
                </div>
                {order.pickupAt && (
                  <div>
                    <p className='text-[10px] text-muted-foreground uppercase tracking-wide font-medium'>
                      Pickup At
                    </p>
                    <p className='text-xs font-medium text-foreground mt-0.5'>
                      {order.pickupAt}
                    </p>
                  </div>
                )}
                {order.address && (
                  <div>
                    <p className='text-[10px] text-muted-foreground uppercase tracking-wide font-medium'>
                      Address
                    </p>
                    <p className='text-xs text-foreground mt-0.5'>{order.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className='space-y-4'>
          {/* Summary */}
          <div className='bg-card rounded-xl border border-border shadow-sm'>
            <div className='px-5 py-4 border-b border-border'>
              <p className='text-sm font-semibold text-foreground'>Order Summary</p>
            </div>
            <div className='px-5 py-4 space-y-2.5'>
              <div className='flex justify-between'>
                <span className='text-xs text-muted-foreground'>Subtotal</span>
                <span className='text-xs font-medium text-foreground'>
                  {formatVND(order.subtotal)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className='flex justify-between'>
                  <span className='text-xs text-muted-foreground'>Discount</span>
                  <span className='text-xs font-medium text-emerald-600'>
                    -{formatVND(order.discount)}
                  </span>
                </div>
              )}
              <div className='flex justify-between pt-2 border-t border-border'>
                <span className='text-xs font-semibold text-foreground'>Total</span>
                <span className='text-sm font-bold text-foreground'>
                  {formatVND(order.total)}
                </span>
              </div>
              <div className='flex justify-between pt-2'>
                <span className='text-xs text-muted-foreground'>Payment</span>
                <span className='text-xs font-medium text-foreground'>
                  {order.paymentMethod}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-muted-foreground'>Paid</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    order.paid ? 'text-emerald-600' : 'text-amber-600',
                  )}
                >
                  {order.paid ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {(nextStatuses.length > 0 || order.status !== 'CANCELLED') && (
            <div className='bg-card rounded-xl border border-border shadow-sm'>
              <div className='px-5 py-4 border-b border-border'>
                <p className='text-sm font-semibold text-foreground'>Actions</p>
              </div>
              <div className='px-5 py-4 space-y-3'>
                {nextStatuses.length > 0 && (
                  <>
                    <div>
                      <p className='text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide'>
                        Update Status
                      </p>
                      <Select
                        value={selectedStatus}
                        onValueChange={(v) => setSelectedStatus(v as OrderStatus)}
                      >
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue placeholder='Select new status...' />
                        </SelectTrigger>
                        <SelectContent>
                          {nextStatuses.map((s) => (
                            <SelectItem key={s} value={s} className='text-xs'>
                              {ORDER_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size='sm'
                      className='w-full h-8 text-xs'
                      disabled={!selectedStatus}
                      onClick={handleUpdateStatus}
                    >
                      Confirm Update
                    </Button>
                  </>
                )}

                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5'
                    onClick={() => setCancelOpen(true)}
                  >
                    <XCircle size={12} />
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Please provide a reason for cancelling this order. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            className='w-full border border-border rounded-lg p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background'
            rows={3}
            placeholder='Reason for cancellation...'
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Back</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={() => {
                setOrder((prev) => prev && { ...prev, status: 'CANCELLED' });
                setCancelOpen(false);
              }}
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
