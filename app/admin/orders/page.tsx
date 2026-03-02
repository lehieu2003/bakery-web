'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';
import { Search, ChevronDown, Eye, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  formatVND,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/admin-data';
import type { OrderStatus } from '@/types/api.types';
import { cn } from '@/lib/utils';
import { useOrders } from '@/hooks/admin/use-orders';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useOrders({
    page,
    limit: 20,
    status: statusFilter !== 'ALL' ? (statusFilter as OrderStatus) : undefined,
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <AdminShell title='Orders'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title='Orders'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p className='text-destructive'>Failed to load orders</p>
        </div>
      </AdminShell>
    );
  }

  const { orders, pagination } = data;

  return (
    <AdminShell title='Orders'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Orders
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {pagination.total} order{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs gap-1.5'
          onClick={() => {
            if (!orders.length) return;
            // Generate CSV content
            const headers = [
              'Order Number',
              'Customer Name',
              'Phone',
              'Email',
              'Address',
              'Subtotal',
              'Delivery Fee',
              'Discount',
              'Total',
              'Payment Method',
              'Payment Status',
              'Status',
              'Created At',
            ];
            const rows = orders.map((o) => [
              o.orderNumber,
              o.customerName,
              o.customerPhone,
              o.customerEmail || '',
              o.customerAddress || '',
              Number(o.subtotal),
              Number(o.deliveryFee),
              Number(o.discount),
              Number(o.total),
              o.paymentMethod || '',
              o.paymentStatus || '',
              o.status,
              new Date(o.createdAt).toLocaleString('vi-VN'),
            ]);
            const csvContent = [
              headers.join(','),
              ...rows.map((row) =>
                row
                  .map((cell) =>
                    typeof cell === 'string' && cell.includes(',')
                      ? `"${cell}"`
                      : cell,
                  )
                  .join(','),
              ),
            ].join('\n');
            // Add BOM for Excel UTF-8 compatibility
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvContent], {
              type: 'text/csv;charset=utf-8;',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={12} />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <div className='relative flex-1 min-w-48 max-w-sm'>
          <Search
            size={13}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
          />
          <Input
            placeholder='Search order number, name, phone...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search
            }}
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5'>
              {statusFilter === 'ALL'
                ? 'All Status'
                : ORDER_STATUS_LABELS[statusFilter as OrderStatus]}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-36'>
            <DropdownMenuItem
              className={cn(
                'text-xs',
                statusFilter === 'ALL' && 'font-semibold',
              )}
              onClick={() => {
                setStatusFilter('ALL');
                setPage(1);
              }}
            >
              All Status
            </DropdownMenuItem>
            {ALL_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                className={cn('text-xs', statusFilter === s && 'font-semibold')}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {ORDER_STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status quick tabs */}
      <div className='flex gap-1.5 flex-wrap mb-4'>
        <button
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className={cn(
            'px-3 py-1 rounded-full text-[10px] font-medium border transition-all',
            statusFilter === 'ALL'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
          )}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={cn(
              'px-3 py-1 rounded-full text-[10px] font-medium border transition-all',
              statusFilter === s
                ? `${ORDER_STATUS_COLORS[s]} border-current`
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Order
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                Customer
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Total
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                Payment
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Status
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Created
              </th>
              <th className='px-5 py-3 w-16' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {orders.map((order) => (
              <tr
                key={order.id}
                className='hover:bg-muted/20 transition-colors'
              >
                <td className='px-5 py-3.5'>
                  <p className='text-xs font-semibold text-foreground'>
                    {order.orderNumber}
                  </p>
                  <p className='text-[10px] text-muted-foreground mt-0.5 sm:hidden'>
                    {order.customerName}
                  </p>
                </td>
                <td className='px-5 py-3.5 hidden sm:table-cell'>
                  <p className='text-xs font-medium text-foreground'>
                    {order.customerName}
                  </p>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>
                    {order.customerPhone}
                  </p>
                </td>
                <td className='px-5 py-3.5'>
                  <p className='text-xs font-semibold text-foreground'>
                    {formatVND(Number(order.total))}
                  </p>
                  {Number(order.discount) > 0 && (
                    <p className='text-[10px] text-emerald-600 mt-0.5'>
                      -{formatVND(Number(order.discount))}
                    </p>
                  )}
                </td>
                <td className='px-5 py-3.5 hidden md:table-cell'>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                      order.paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200',
                    )}
                  >
                    {order.paymentStatus || 'PENDING'}
                  </span>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>
                    {order.paymentMethod || 'N/A'}
                  </p>
                </td>
                <td className='px-5 py-3.5'>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </span>
                </td>
                <td className='px-5 py-3.5 hidden lg:table-cell'>
                  <span className='text-[10px] text-muted-foreground'>
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </span>
                </td>
                <td className='px-5 py-3.5'>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 text-xs gap-1'
                    >
                      <Eye size={11} />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-sm text-muted-foreground'>
              No orders match the current filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className='text-xs text-muted-foreground'>
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </AdminShell>
  );
}
