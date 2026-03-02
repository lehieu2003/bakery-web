'use client';

import { use, useRef, useState } from 'react';
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
          <title>Order ${order.orderCode}</title>
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
            .item-opts { font-size: 11px; color: #888; margin-top: 2px; }
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

      {/* Hidden print template */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className='header'>
          <div>
            <h1>{order.orderCode}</h1>
            <div className='brand'>La Douceur Bakery &mdash; Admin Order Receipt</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className='label'>Status</div>
            <span className='badge'>{ORDER_STATUS_LABELS[order.status]}</span>
            <div className='label' style={{ marginTop: 8 }}>Created</div>
            <div className='value'>{order.createdAt}</div>
          </div>
        </div>

        <div className='grid-2'>
          <div>
            <h2>Customer</h2>
            <div className='label'>Name</div>
            <div className='value'>{order.customerName}</div>
            <div className='label' style={{ marginTop: 8 }}>Phone</div>
            <div className='value'>{order.phone}</div>
            {order.note && (
              <>
                <div className='label' style={{ marginTop: 8 }}>Note</div>
                <div className='value'>{order.note}</div>
              </>
            )}
          </div>
          <div>
            <h2>Fulfillment</h2>
            <div className='label'>Type</div>
            <div className='value'>{order.fulfillment}</div>
            {order.pickupAt && (
              <>
                <div className='label' style={{ marginTop: 8 }}>Pickup At</div>
                <div className='value'>{order.pickupAt}</div>
              </>
            )}
            {order.address && (
              <>
                <div className='label' style={{ marginTop: 8 }}>Address</div>
                <div className='value'>{order.address}</div>
              </>
            )}
            <div className='label' style={{ marginTop: 8 }}>Payment</div>
            <div className='value'>
              {order.paymentMethod} &mdash; {order.paid ? 'Paid' : 'Unpaid'}
            </div>
          </div>
        </div>

        <div className='section'>
          <h2>Items</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className='item-name'>{item.name}</div>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <div className='item-opts'>
                        {Object.entries(item.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatVND(item.unitPrice)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatVND(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='totals'>
            <div className='total-row'>
              <span>Subtotal</span>
              <span>{formatVND(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className='total-row' style={{ color: '#059669' }}>
                <span>Discount</span>
                <span>-{formatVND(order.discount)}</span>
              </div>
            )}
            <div className='total-row grand'>
              <span>Total</span>
              <span>{formatVND(order.total)}</span>
            </div>
          </div>
        </div>

        <div className='footer'>
          Printed by La Douceur Admin &mdash; {new Date().toLocaleString('vi-VN')}
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
