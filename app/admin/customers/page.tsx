'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Search,
  Eye,
  Crown,
  X,
  Phone,
  Mail,
  CalendarDays,
  ShoppingBag,
  Wallet,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  mockCustomers,
  mockOrders,
  formatVND,
  MEMBER_LEVEL_COLORS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  MemberLevel,
  Customer,
} from '@/lib/admin-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type LevelFilter = 'ALL' | MemberLevel;

function CustomerDetailPanel({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  // Filter orders that belong to this customer by name (mock data matching)
  const customerOrders = mockOrders.filter(
    (o) => o.customerName.toLowerCase() === customer.name.toLowerCase(),
  );

  const levelBadge = MEMBER_LEVEL_COLORS[customer.level];

  const statCards = [
    { label: 'Total Orders', value: customer.totalOrders, icon: ShoppingBag },
    { label: 'Total Spent', value: formatVND(customer.totalSpent), icon: Wallet },
    { label: 'Points', value: `${customer.points.toLocaleString()} pts`, icon: Star },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/30 z-40 transition-opacity'
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className='fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-border shrink-0'>
          <h2 className='font-serif text-base font-semibold text-foreground'>Customer Detail</h2>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors'
          >
            <X size={14} className='text-muted-foreground' />
          </button>
        </div>

        {/* Scrollable content */}
        <div className='flex-1 overflow-y-auto'>
          {/* Profile section */}
          <div className='px-6 py-5 border-b border-border'>
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
                <span className='text-base font-bold text-primary'>
                  {customer.name.charAt(0)}
                </span>
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='font-semibold text-sm text-foreground truncate'>{customer.name}</h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1',
                    levelBadge,
                  )}
                >
                  <Crown size={9} />
                  {customer.level}
                </span>
              </div>
            </div>

            {/* Contact info */}
            <div className='mt-4 space-y-2'>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Mail size={11} className='shrink-0' />
                <span className='truncate'>{customer.email}</span>
              </div>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Phone size={11} className='shrink-0' />
                <span>{customer.phone}</span>
              </div>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <CalendarDays size={11} className='shrink-0' />
                <span>
                  Member since{' '}
                  {new Date(customer.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className='px-6 py-4 border-b border-border'>
            <div className='grid grid-cols-3 gap-3'>
              {statCards.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className='bg-muted/40 rounded-xl p-3 flex flex-col items-center text-center'
                >
                  <Icon size={14} className='text-primary mb-1.5' />
                  <p className='text-[11px] font-semibold text-foreground leading-tight'>{value}</p>
                  <p className='text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide'>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Membership progress */}
          <div className='px-6 py-4 border-b border-border'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3'>
              Membership Progress
            </p>
            {customer.level === 'PLATINUM' ? (
              <div className='flex items-center gap-2 text-xs text-pink-600'>
                <Crown size={13} />
                <span className='font-medium'>Highest tier reached — Platinum</span>
              </div>
            ) : (
              (() => {
                const thresholds: Record<MemberLevel, number> = {
                  SILVER: 200,
                  GOLD: 600,
                  PLATINUM: 1200,
                };
                const nextLevel: Record<string, MemberLevel> = {
                  SILVER: 'GOLD',
                  GOLD: 'PLATINUM',
                };
                const next = nextLevel[customer.level];
                const target = thresholds[next];
                const pct = Math.min((customer.points / target) * 100, 100);
                return (
                  <div>
                    <div className='flex justify-between text-[10px] text-muted-foreground mb-1.5'>
                      <span>{customer.points.toLocaleString()} pts</span>
                      <span>
                        {target.toLocaleString()} pts to{' '}
                        <span className='font-medium text-foreground'>{next}</span>
                      </span>
                    </div>
                    <div className='h-1.5 bg-muted rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-primary rounded-full transition-all'
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className='text-[10px] text-muted-foreground mt-1'>
                      {(target - customer.points).toLocaleString()} more points needed
                    </p>
                  </div>
                );
              })()
            )}
          </div>

          {/* Order history */}
          <div className='px-6 py-4'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3'>
              Order History
            </p>
            {customerOrders.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No orders found for this customer.</p>
            ) : (
              <div className='space-y-2'>
                {customerOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className='flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors group'
                  >
                    <div className='min-w-0'>
                      <p className='text-xs font-medium text-foreground'>{order.orderCode}</p>
                      <p className='text-[10px] text-muted-foreground mt-0.5'>
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' · '}
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 shrink-0 ml-2'>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                          ORDER_STATUS_COLORS[order.status],
                        )}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span className='text-xs font-semibold text-foreground'>
                        {formatVND(order.total)}
                      </span>
                      <ChevronRight
                        size={12}
                        className='text-muted-foreground group-hover:translate-x-0.5 transition-transform'
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = mockCustomers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchLevel = levelFilter === 'ALL' || c.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <AdminShell title='Customers'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Customers</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <div className='relative flex-1 min-w-48 max-w-sm'>
          <Search
            size={13}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
          />
          <Input
            placeholder='Search name, email, phone...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='flex rounded-lg border border-border overflow-hidden bg-card'>
          {(['ALL', 'SILVER', 'GOLD', 'PLATINUM'] as LevelFilter[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                levelFilter === l
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {l === 'ALL' ? 'All' : l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Customer
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                Level
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                Points
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Orders
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Total Spent
              </th>
              <th className='px-5 py-3 w-16' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {filtered.map((customer) => (
              <tr
                key={customer.id}
                className='hover:bg-muted/20 transition-colors cursor-pointer'
                onClick={() => setSelectedCustomer(customer)}
              >
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
                      <span className='text-xs font-semibold text-primary'>
                        {customer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className='text-xs font-medium text-foreground'>{customer.name}</p>
                      <p className='text-[10px] text-muted-foreground mt-0.5'>{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className='px-5 py-3.5 hidden sm:table-cell'>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${MEMBER_LEVEL_COLORS[customer.level]}`}
                  >
                    <Crown size={9} />
                    {customer.level}
                  </span>
                </td>
                <td className='px-5 py-3.5 hidden md:table-cell'>
                  <span className='text-xs font-medium text-foreground'>
                    {customer.points.toLocaleString()} pts
                  </span>
                </td>
                <td className='px-5 py-3.5 hidden lg:table-cell'>
                  <span className='text-xs text-muted-foreground'>{customer.totalOrders}</span>
                </td>
                <td className='px-5 py-3.5 hidden lg:table-cell'>
                  <span className='text-xs font-medium text-foreground'>
                    {formatVND(customer.totalSpent)}
                  </span>
                </td>
                <td className='px-5 py-3.5' onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 text-xs gap-1'
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <Eye size={11} />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-sm text-muted-foreground'>No customers found</p>
          </div>
        )}
      </div>

      {/* Customer detail slide-over */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </AdminShell>
  );
}
