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
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatVND, MEMBER_LEVEL_COLORS, MemberLevel } from '@/lib/admin-data';
import { cn } from '@/lib/utils';
import { useCustomer, useCustomers } from '@/hooks/admin/use-customers';

type LevelFilter = 'ALL' | MemberLevel;

interface CustomerData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null | undefined;
  level: MemberLevel;
  points: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

function CustomerDetailPanel({
  customer,
  onClose,
}: {
  customer: CustomerData;
  onClose: () => void;
}) {
  const { data: detail, isLoading: detailLoading } = useCustomer(customer.id);
  const memberLevel = (detail?.memberLevel || detail?.level || customer.level) as MemberLevel;
  const points = detail?.points ?? customer.points;
  const totalOrders = detail?.totalOrders ?? customer.totalOrders;
  const totalSpent = Number(detail?.totalSpent ?? customer.totalSpent);
  const displayName = detail?.name ?? customer.name;
  const displayEmail = detail?.email ?? customer.email;
  const displayPhone = detail?.phone ?? customer.phone;
  const createdAt = detail?.createdAt ?? customer.createdAt;
  const levelBadge = MEMBER_LEVEL_COLORS[memberLevel];
  const recentOrders = detail?.recentOrders ?? [];
  const recentPayments = detail?.recentPayments ?? [];
  const recentNotifications = detail?.recentNotifications ?? [];
  const unreadPublished = detail?.notificationSummary?.unreadPublished ?? 0;

  const statCards = [
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag },
    {
      label: 'Total Spent',
      value: formatVND(totalSpent),
      icon: Wallet,
    },
    {
      label: 'Points',
      value: `${points.toLocaleString()} pts`,
      icon: Star,
    },
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
          <h2 className='font-serif text-base font-semibold text-foreground'>
            Customer Detail
          </h2>
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
                  {(displayName || displayEmail).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='font-semibold text-sm text-foreground truncate'>
                  {displayName || 'No name'}
                </h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1',
                    levelBadge,
                  )}
                >
                  <Crown size={9} />
                  {memberLevel}
                </span>
              </div>
            </div>

            {/* Contact info */}
            <div className='mt-4 space-y-2'>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Mail size={11} className='shrink-0' />
                <span className='truncate'>{displayEmail}</span>
              </div>
              {displayPhone && (
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <Phone size={11} className='shrink-0' />
                  <span>{displayPhone}</span>
                </div>
              )}
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <CalendarDays size={11} className='shrink-0' />
                <span>
                  Member since{' '}
                  {new Date(createdAt).toLocaleDateString('vi-VN')}
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
                  <p className='text-[11px] font-semibold text-foreground leading-tight'>
                    {value}
                  </p>
                  <p className='text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide'>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Membership progress */}
          <div className='px-6 py-4'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3'>
              Membership Progress
            </p>
            {memberLevel === 'PLATINUM' ? (
              <div className='flex items-center gap-2 text-xs text-pink-600'>
                <Crown size={13} />
                <span className='font-medium'>
                  Highest tier reached — Platinum
                </span>
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
                const next = nextLevel[memberLevel];
                const target = thresholds[next];
                const pct = Math.min((points / target) * 100, 100);
                return (
                  <div>
                    <div className='flex justify-between text-[10px] text-muted-foreground mb-1.5'>
                      <span>{points.toLocaleString()} pts</span>
                      <span>
                        {target.toLocaleString()} pts to{' '}
                        <span className='font-medium text-foreground'>
                          {next}
                        </span>
                      </span>
                    </div>
                    <div className='h-1.5 bg-muted rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-primary rounded-full transition-all'
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className='text-[10px] text-muted-foreground mt-1'>
                      {(target - points).toLocaleString()} more points
                      needed
                    </p>
                  </div>
                );
              })()
            )}
          </div>

          <div className='px-6 py-4 border-t border-border'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
              Operational Context
            </p>
            {detailLoading && (
              <p className='text-[11px] text-muted-foreground mb-2'>Loading latest support data...</p>
            )}
            <p className='text-[11px] text-muted-foreground'>
              Unread published notifications: {unreadPublished}
            </p>
          </div>

          <div className='px-6 py-4 border-t border-border'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
              Recent Orders
            </p>
            {recentOrders.length === 0 && (
              <p className='text-[11px] text-muted-foreground'>No recent orders.</p>
            )}
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className='text-[11px] py-1.5 border-b border-border last:border-b-0'>
                <p className='font-medium text-foreground'>{order.orderNumber}</p>
                <p className='text-muted-foreground'>
                  {order.status} • {formatVND(order.total)}
                </p>
              </div>
            ))}
          </div>

          <div className='px-6 py-4 border-t border-border'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
              Recent Payments
            </p>
            {recentPayments.length === 0 && (
              <p className='text-[11px] text-muted-foreground'>No recent payments.</p>
            )}
            {recentPayments.slice(0, 5).map((payment) => (
              <div key={payment.paymentId} className='text-[11px] py-1.5 border-b border-border last:border-b-0'>
                <p className='font-medium text-foreground'>{payment.provider}</p>
                <p className='text-muted-foreground'>
                  {payment.status} • {formatVND(payment.amount)}
                </p>
              </div>
            ))}
          </div>

          <div className='px-6 py-4 border-t border-border'>
            <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
              Recent Notifications
            </p>
            {recentNotifications.length === 0 && (
              <p className='text-[11px] text-muted-foreground'>No notification reads.</p>
            )}
            {recentNotifications.slice(0, 5).map((notification) => (
              <div key={notification.notificationId} className='text-[11px] py-1.5 border-b border-border last:border-b-0'>
                <p className='font-medium text-foreground'>{notification.title}</p>
                <p className='text-muted-foreground'>
                  {notification.status} • Read {new Date(notification.readAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(
    null,
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCustomers({
    page,
    limit: 20,
    search: search || undefined,
    level: levelFilter !== 'ALL' ? levelFilter : undefined,
  });

  if (isLoading) {
    return (
      <AdminShell title='Customers'>
        <div className='flex items-center justify-center min-h-100'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title='Customers'>
        <div className='flex items-center justify-center min-h-100'>
          <p className='text-destructive'>Failed to load customers</p>
        </div>
      </AdminShell>
    );
  }

  // Handle both array and object response formats
  const rawCustomers = data?.customers || [];
  const pagination = data?.pagination;

  // Map API response to CustomerData interface
  const customers: CustomerData[] = rawCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    level: c.memberLevel || c.level || 'SILVER',
    points: c.points || 0,
    totalOrders: c.totalOrders || 0,
    totalSpent: c.totalSpent || 0,
    createdAt: c.createdAt,
  }));

  return (
    <AdminShell title='Customers'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Customers
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {pagination?.total || customers.length} customer
            {(pagination?.total || customers.length) !== 1 ? 's' : ''}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className='flex rounded-lg border border-border overflow-hidden bg-card'>
          {(['ALL', 'SILVER', 'GOLD', 'PLATINUM'] as LevelFilter[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLevelFilter(l);
                setPage(1);
              }}
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
            {customers.map((customer: CustomerData) => (
              <tr
                key={customer.id}
                className='hover:bg-muted/20 transition-colors cursor-pointer'
                onClick={() => setSelectedCustomer(customer)}
              >
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
                      <span className='text-xs font-semibold text-primary'>
                        {(customer.name || customer.email)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className='text-xs font-medium text-foreground'>
                        {customer.name || 'No name'}
                      </p>
                      <p className='text-[10px] text-muted-foreground mt-0.5'>
                        {customer.email}
                      </p>
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
                  <span className='text-xs text-muted-foreground'>
                    {customer.totalOrders}
                  </span>
                </td>
                <td className='px-5 py-3.5 hidden lg:table-cell'>
                  <span className='text-xs font-medium text-foreground'>
                    {formatVND(Number(customer.totalSpent))}
                  </span>
                </td>
                <td
                  className='px-5 py-3.5'
                  onClick={(e) => e.stopPropagation()}
                >
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

        {customers.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-sm text-muted-foreground'>No customers found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
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
