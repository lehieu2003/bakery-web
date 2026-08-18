'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Printer, Loader2 } from 'lucide-react';
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
  formatVND,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/admin-data';
import {
  useOrder,
  useOrderAudit,
  useOrderInvestigation,
  useUpdateOrder,
} from '@/hooks/admin/use-orders';
import type {
  OrderStatus,
  OrderItem,
  OrderInvestigationAttempt,
  OrderInvestigationCallbackEvent,
} from '@/types/api.types';
import { getProductImage } from '@/lib/utils';
import AuditLogList from '@/components/admin/AuditLogList';

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY'],
  READY: ['COMPLETED'],
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: order, isLoading, error } = useOrder(id);
  const {
    data: orderAudit,
    isLoading: auditLoading,
    error: auditError,
  } = useOrderAudit(id, 1, 10);
  const {
    data: investigation,
    isLoading: investigationLoading,
    error: investigationError,
  } = useOrderInvestigation(id);
  const updateMutation = useUpdateOrder();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!order) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;
    const content = printRef.current?.innerHTML ?? '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Order ${order.orderNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
            h1 { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
            h2 { font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; margin-bottom: 24px; }
            .brand { font-size: 11px; color: #888; margin-top: 4px; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid currentColor; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
            .section { margin-bottom: 24px; }
            .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
            .value { font-size: 13px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 11px; color: #888; font-weight: 500; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; }
            td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; vertical-align: middle; }
            .item-name { font-weight: 600; }
            .totals { width: 280px; margin-left: auto; margin-top: 16px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
            .total-row.grand { font-size: 15px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 6px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px dashed #ddd; padding-top: 16px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-100'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className='text-center py-20'>
        <p className='text-muted-foreground text-sm'>Order not found.</p>
        <Link href='/admin/orders'>
          <Button variant='outline' size='sm' className='mt-4 text-xs'>
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const nextStatuses: OrderStatus[] = (order.status ? NEXT_STATUSES[order.status as OrderStatus] : undefined) ?? [];

  const handleUpdateStatus = async () => {
    if (selectedStatus) {
      await updateMutation.mutateAsync({
        id: order.id,
        data: { status: selectedStatus as OrderStatus },
      });
      setSelectedStatus('');
    }
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({
      id: order.id,
      data: { status: 'CANCELLED', notes: cancelReason },
    });
    setCancelOpen(false);
    setCancelReason('');
  };

  const createdDate = new Date(order.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
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
              {order.orderNumber}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}
            >
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </span>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Created {createdDate}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs gap-1.5 hidden sm:flex'
          onClick={handlePrint}
        >
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
                Items ({order.orderItems.length})
              </p>
            </div>
            <div className='divide-y divide-border'>
              {order.orderItems.map((item: OrderItem) => (
                <div key={item.id} className='flex gap-3 px-5 py-4'>
                  <div className='w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted'>
                    {item.product ? (
                      <Image
                        src={getProductImage(item.product)}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs'>
                        N/A
                      </div>
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-foreground'>
                      {item.product?.name || item.name}
                    </p>
                    <p className='text-[10px] text-muted-foreground mt-0.5'>
                      Qty: {item.quantity} · {formatVND(Number(item.price))}{' '}
                      each
                    </p>
                  </div>
                  <p className='text-xs font-semibold text-foreground shrink-0'>
                    {formatVND(Number(item.subtotal))}
                  </p>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className='px-5 py-4 border-t border-border bg-muted/30'>
              <div className='max-w-xs ml-auto space-y-1.5'>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>Subtotal</span>
                  <span className='text-foreground'>
                    {formatVND(Number(order.subtotal))}
                  </span>
                </div>
                {Number(order.deliveryFee) > 0 && (
                  <div className='flex justify-between text-xs'>
                    <span className='text-muted-foreground'>Delivery Fee</span>
                    <span className='text-foreground'>
                      {formatVND(Number(order.deliveryFee))}
                    </span>
                  </div>
                )}
                {Number(order.discount) > 0 && (
                  <div className='flex justify-between text-xs'>
                    <span className='text-muted-foreground'>Discount</span>
                    <span className='text-green-600'>
                      -{formatVND(Number(order.discount))}
                    </span>
                  </div>
                )}
                <div className='flex justify-between text-sm font-semibold pt-2 border-t border-border'>
                  <span className='text-foreground'>Total</span>
                  <span className='text-primary'>
                    {formatVND(Number(order.total))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className='space-y-4'>
          {/* Customer Info */}
          <div className='bg-card rounded-xl border border-border shadow-sm p-5'>
            <h2 className='text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border'>
              Customer
            </h2>
            <div className='space-y-2.5'>
              <div>
                <p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                  Name
                </p>
                <p className='text-xs text-foreground font-medium'>
                  {order.customerName}
                </p>
              </div>
              <div>
                <p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                  Phone
                </p>
                <p className='text-xs text-foreground'>{order.customerPhone}</p>
              </div>
              {order.customerEmail && (
                <div>
                  <p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                    Email
                  </p>
                  <p className='text-xs text-foreground'>
                    {order.customerEmail}
                  </p>
                </div>
              )}
              {order.customerAddress && (
                <div>
                  <p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                    Address
                  </p>
                  <p className='text-xs text-foreground'>
                    {order.customerAddress}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className='bg-card rounded-xl border border-border shadow-sm p-5'>
            <h2 className='text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border'>
              Payment
            </h2>
            <div className='space-y-2.5'>
              <div>
                <p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                  Method
                </p>
                <p className='text-xs text-foreground font-medium'>
                  {order.paymentMethod || 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                  Status
                </p>
                <p className='text-xs text-foreground'>
                  {order.payment?.status || order.paymentMethod || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {nextStatuses.length > 0 && (
            <div className='bg-card rounded-xl border border-border shadow-sm p-5'>
              <h2 className='text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border'>
                Update Status
              </h2>
              <div className='space-y-3'>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as OrderStatus)}
                >
                  <SelectTrigger className='h-9 text-xs'>
                    <SelectValue placeholder='Select new status' />
                  </SelectTrigger>
                  <SelectContent>
                    {nextStatuses
                      .filter((s: OrderStatus) => s !== 'CANCELLED')
                      .map((status: OrderStatus) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className='text-xs'
                        >
                          {ORDER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  size='sm'
                  className='w-full h-8 text-xs'
                  onClick={handleUpdateStatus}
                  disabled={!selectedStatus || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    'Update Status'
                  )}
                </Button>
                {nextStatuses.includes('CANCELLED') && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full h-8 text-xs text-destructive hover:text-destructive'
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='mt-4'>
        <AuditLogList
          title='Order Audit History'
          logs={orderAudit?.logs}
          isLoading={auditLoading}
          error={!!auditError}
          emptyText='No order audit entries yet.'
        />
      </div>

      <div className='mt-4 bg-card rounded-xl border border-border shadow-sm p-5'>
        <h2 className='text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border'>
          Discrepancy Investigation
        </h2>
        {investigationLoading ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Loader2 className='w-3 h-3 animate-spin' />
            Loading investigation timeline...
          </div>
        ) : investigationError ? (
          <p className='text-xs text-destructive'>
            Unable to load investigation context.
          </p>
        ) : (
          <div className='space-y-4'>
            <div className='grid sm:grid-cols-2 gap-3'>
              <div className='rounded-lg border border-border p-3'>
                <p className='text-[10px] text-muted-foreground uppercase tracking-wide mb-1'>
                  Current Order State
                </p>
                <p className='text-xs font-medium text-foreground'>
                  {investigation?.order.status ?? 'N/A'}
                </p>
              </div>
              <div className='rounded-lg border border-border p-3'>
                <p className='text-[10px] text-muted-foreground uppercase tracking-wide mb-1'>
                  Current Payment State
                </p>
                <p className='text-xs font-medium text-foreground'>
                  {investigation?.payment?.status ?? 'N/A'}
                </p>
                <p className='text-[10px] text-muted-foreground mt-0.5'>
                  {investigation?.payment?.provider ?? 'Unknown provider'}
                </p>
              </div>
            </div>

            <div>
              <p className='text-xs font-semibold text-foreground mb-2'>
                Callback Timeline
              </p>
              {investigation?.callbackTimeline?.length ? (
                <div className='space-y-2'>
                  {investigation.callbackTimeline.slice(0, 10).map((event: OrderInvestigationCallbackEvent) => (
                    <div
                      key={event.id}
                      className='rounded-lg border border-border px-3 py-2'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-xs font-medium text-foreground'>
                          {event.provider} · {event.event}
                        </p>
                        <p className='text-[10px] text-muted-foreground'>
                          {new Date(event.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <p className='text-[11px] text-muted-foreground mt-1'>
                        Status: {event.incomingStatus ?? 'N/A'} · Outcome:{' '}
                        {event.outcome ?? 'N/A'} · Tx:{' '}
                        {event.transactionId ?? 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  No callback timeline records yet.
                </p>
              )}
            </div>

            <div>
              <p className='text-xs font-semibold text-foreground mb-2'>
                Reconciliation Attempts
              </p>
              {investigation?.reconciliationAttempts?.length ? (
                <div className='space-y-1.5'>
                  {investigation.reconciliationAttempts
                    .slice(0, 10)
                    .map((attempt: OrderInvestigationAttempt) => (
                      <div
                        key={attempt.callbackEventId}
                        className='text-[11px] text-muted-foreground'
                      >
                        {new Date(attempt.createdAt).toLocaleString('vi-VN')} ·{' '}
                        {attempt.provider} · {attempt.outcome} · incoming:{' '}
                        {attempt.incomingStatus ?? 'N/A'}
                      </div>
                    ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  No reconciliation attempts detected.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print template (hidden) */}
      <div className='hidden'>
        <div ref={printRef}>
          <div className='header'>
            <div>
              <h1>{order.orderNumber}</h1>
              <div className='brand'>Bakery Shop</div>
            </div>
            <span className='badge'>{ORDER_STATUS_LABELS[order.status as OrderStatus]}</span>
          </div>
          <div className='grid-2'>
            <div className='section'>
              <h2>Customer</h2>
              <div>
                <div className='label'>Name</div>
                <div className='value'>{order.customerName}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className='label'>Phone</div>
                <div className='value'>{order.customerPhone}</div>
              </div>
              {order.customerAddress && (
                <div style={{ marginTop: 8 }}>
                  <div className='label'>Address</div>
                  <div className='value'>{order.customerAddress}</div>
                </div>
              )}
            </div>
            <div className='section'>
              <h2>Order Info</h2>
              <div>
                <div className='label'>Date</div>
                <div className='value'>{createdDate}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className='label'>Payment</div>
                <div className='value'>{order.paymentMethod || 'N/A'}</div>
              </div>
            </div>
          </div>
          <div className='section'>
            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ width: 60 }}>Qty</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Price</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems.map((item: OrderItem) => (
                  <tr key={item.id}>
                    <td>
                      <div className='item-name'>
                        {item.product?.name || item.name}
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatVND(Number(item.price))}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatVND(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className='totals'>
              <div className='total-row'>
                <span>Subtotal</span>
                <span>{formatVND(Number(order.subtotal))}</span>
              </div>
              {Number(order.deliveryFee) > 0 && (
                <div className='total-row'>
                  <span>Delivery</span>
                  <span>{formatVND(Number(order.deliveryFee))}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className='total-row'>
                  <span>Discount</span>
                  <span>-{formatVND(Number(order.discount))}</span>
                </div>
              )}
              <div className='total-row grand'>
                <span>Total</span>
                <span>{formatVND(Number(order.total))}</span>
              </div>
            </div>
          </div>
          <div className='footer'>Thank you for your order! • Bakery Shop</div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base'>
              Cancel Order?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This action cannot be undone. Please provide a reason:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            className='w-full h-20 px-3 py-2 text-xs border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20'
            placeholder='Reason for cancellation...'
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className='h-8 text-xs'>
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              className='h-8 text-xs bg-destructive hover:bg-destructive/90'
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
