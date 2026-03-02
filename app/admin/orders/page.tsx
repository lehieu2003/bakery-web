'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  mockOrders,
  Order,
  OrderStatus,
  FulfillmentType,
  formatVND,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/admin-data';
import { cn } from '@/lib/utils';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'PAID',
];

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('ALL');

  const filtered = mockOrders.filter((o) => {
    const matchSearch =
      !search ||
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search);
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchFulfillment =
      fulfillmentFilter === 'ALL' || o.fulfillment === fulfillmentFilter;
    return matchSearch && matchStatus && matchFulfillment;
  });

  return (
    <AdminShell title='Orders'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Orders</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5'>
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
            placeholder='Search order code, name, phone...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5'>
              <Filter size={12} />
              {statusFilter === 'ALL' ? 'All Status' : ORDER_STATUS_LABELS[statusFilter as OrderStatus]}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-36'>
            <DropdownMenuItem
              className={cn('text-xs', statusFilter === 'ALL' && 'font-semibold')}
              onClick={() => setStatusFilter('ALL')}
            >
              All Status
            </DropdownMenuItem>
            {ALL_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                className={cn('text-xs', statusFilter === s && 'font-semibold')}
                onClick={() => setStatusFilter(s)}
              >
                {ORDER_STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fulfillment filter */}
        <div className='flex rounded-lg border border-border overflow-hidden bg-card'>
          {(['ALL', 'PICKUP', 'DELIVERY'] as (string | FulfillmentType)[]).map((f) => (
            <button
              key={f}
              onClick={() => setFulfillmentFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                fulfillmentFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Status quick tabs */}
      <div className='flex gap-1.5 flex-wrap mb-4'>
        <button
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'px-3 py-1 rounded-full text-[10px] font-medium border transition-all',
            statusFilter === 'ALL'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
          )}
        >
          All ({mockOrders.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = mockOrders.filter((o) => o.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-full text-[10px] font-medium border transition-all',
                statusFilter === s
                  ? `${ORDER_STATUS_COLORS[s]} border-current`
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
              )}
            >
              {ORDER_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
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
                Fulfillment
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
            {filtered.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-sm text-muted-foreground'>No orders match the current filters</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <tr className='hover:bg-muted/20 transition-colors'>
      <td className='px-5 py-3.5'>
        <p className='text-xs font-semibold text-foreground'>{order.orderCode}</p>
        <p className='text-[10px] text-muted-foreground mt-0.5 sm:hidden'>
          {order.customerName}
        </p>
      </td>
      <td className='px-5 py-3.5 hidden sm:table-cell'>
        <p className='text-xs font-medium text-foreground'>{order.customerName}</p>
        <p className='text-[10px] text-muted-foreground mt-0.5'>{order.phone}</p>
      </td>
      <td className='px-5 py-3.5'>
        <p className='text-xs font-semibold text-foreground'>{formatVND(order.total)}</p>
        {order.discount > 0 && (
          <p className='text-[10px] text-emerald-600 mt-0.5'>
            -{formatVND(order.discount)}
          </p>
        )}
      </td>
      <td className='px-5 py-3.5 hidden md:table-cell'>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
            order.fulfillment === 'PICKUP'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-orange-50 text-orange-700 border-orange-200',
          )}
        >
          {order.fulfillment}
        </span>
        {order.pickupAt && (
          <p className='text-[10px] text-muted-foreground mt-0.5'>{order.pickupAt}</p>
        )}
      </td>
      <td className='px-5 py-3.5'>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ORDER_STATUS_COLORS[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </td>
      <td className='px-5 py-3.5 hidden lg:table-cell'>
        <span className='text-[10px] text-muted-foreground'>{order.createdAt}</span>
      </td>
      <td className='px-5 py-3.5'>
        <Link href={`/admin/orders/${order.id}`}>
          <Button variant='ghost' size='sm' className='h-7 text-xs gap-1'>
            <Eye size={11} />
            View
          </Button>
        </Link>
      </td>
    </tr>
  );
}
