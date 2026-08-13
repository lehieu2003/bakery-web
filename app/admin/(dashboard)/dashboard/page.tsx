'use client';

import { useState } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Plus,
  ImageIcon,
  Users,
  Package,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  formatVND,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  OrderStatus,
} from '@/lib/admin-data';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboard } from '@/hooks/admin/use-dashboard';

const formatRevenue = (val: number) => `₫${(val / 1000000).toFixed(1)}M`;

export default function DashboardPage() {
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);
  const { data, isLoading, error } = useDashboard(windowDays);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-destructive'>Failed to load dashboard data</p>
      </div>
    );
  }

  const { kpi, chartData, recentOrders } = data;
  const pending =
    data.orderStates.find((item) => item.status === 'PENDING')?.count ?? 0;
  const completed =
    data.orderStates.find((item) => item.status === 'COMPLETED')?.count ?? 0;
  const cancelled =
    data.orderStates.find((item) => item.status === 'CANCELLED')?.count ?? 0;

  const kpiCards = [
    {
      label: "Today's Orders",
      value: kpi.todayOrders.toString(),
      sub: `${kpi.pendingOrders} pending`,
      icon: <ShoppingCart size={18} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Revenue Today',
      value: formatRevenue(kpi.todayRevenue),
      sub: 'From completed orders',
      icon: <TrendingUp size={18} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: `Conversion (${windowDays}d)`,
      value: `${kpi.conversionRate.toFixed(2)}%`,
      sub: `${kpi.periodCompletedOrders}/${kpi.periodOrders} completed`,
      icon: <Users size={18} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: `Order States (${windowDays}d)`,
      value: `${pending}`,
      sub: `${completed} completed • ${cancelled} cancelled`,
      icon: <Package size={18} />,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    },
  ];

  const totalWeekOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
  const totalWeekRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  return (
    <>
      {/* Page header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Dashboard
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <select
            value={windowDays}
            onChange={(event) =>
              setWindowDays(Number(event.target.value) as 7 | 14 | 30)
            }
            className='h-8 rounded-md border border-input bg-background px-2 text-xs'
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Link href='/admin/products/new'>
            <Button size='sm' className='h-8 text-xs gap-1.5'>
              <Plus size={13} />
              Add Product
            </Button>
          </Link>
          <Link href='/admin/banners'>
            <Button size='sm' variant='outline' className='h-8 text-xs gap-1.5'>
              <ImageIcon size={13} />
              Add Banner
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className='bg-card rounded-xl border border-border p-4 shadow-sm'
          >
            <div className='flex items-start justify-between mb-3'>
              <p className='text-xs text-muted-foreground font-medium'>
                {card.label}
              </p>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
            </div>
            <p className='font-serif text-xl font-semibold text-foreground'>
              {card.value}
            </p>
            <p className='text-[10px] text-muted-foreground mt-1'>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className='grid lg:grid-cols-2 gap-4 mb-6'>
        {/* Orders chart */}
        <div className='bg-card rounded-xl border border-border p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <p className='text-sm font-semibold text-foreground'>
                Orders (Last {windowDays} days)
              </p>
              <p className='text-[10px] text-muted-foreground'>
                Total: {totalWeekOrders} orders
              </p>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={160}>
            <AreaChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
            >
              <defs>
                <linearGradient id='ordersGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop
                    offset='5%'
                    stopColor='var(--color-primary)'
                    stopOpacity={0.2}
                  />
                  <stop
                    offset='95%'
                    stopColor='var(--color-primary)'
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='var(--color-border)'
              />
              <XAxis
                dataKey='day'
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                }}
                formatter={(val: number) => [val, 'Orders']}
              />
              <Area
                type='monotone'
                dataKey='orders'
                stroke='var(--color-primary)'
                strokeWidth={2}
                fill='url(#ordersGrad)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue chart */}
        <div className='bg-card rounded-xl border border-border p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <p className='text-sm font-semibold text-foreground'>
                Revenue (Last {windowDays} days)
              </p>
              <p className='text-[10px] text-muted-foreground'>
                Total: {formatRevenue(totalWeekRevenue)}
              </p>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={160}>
            <AreaChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id='revenueGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#10b981' stopOpacity={0.2} />
                  <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='var(--color-border)'
              />
              <XAxis
                dataKey='day'
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v / 1000000}M`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                }}
                formatter={(val: number) => [formatRevenue(val), 'Revenue']}
              />
              <Area
                type='monotone'
                dataKey='revenue'
                stroke='#10b981'
                strokeWidth={2}
                fill='url(#revenueGrad)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Orders */}
      <div className='bg-card rounded-xl border border-border shadow-sm'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
          <p className='text-sm font-semibold text-foreground'>Latest Orders</p>
          <Link href='/admin/orders'>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs gap-1 text-muted-foreground hover:text-foreground'
            >
              View all
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
        <div className='divide-y divide-border'>
          {recentOrders.length === 0 ? (
            <p className='text-xs text-muted-foreground text-center py-8'>
              No orders yet
            </p>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className='flex items-center gap-4 px-5 py-3'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <p className='text-xs font-semibold text-foreground'>
                      {order.orderNumber}
                    </p>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                  </div>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>
                    {order.customerName} ·{' '}
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <p className='text-xs font-semibold text-foreground shrink-0'>
                  {formatVND(order.total)}
                </p>
                <Link href={`/admin/orders/${order.id}`}>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 text-xs shrink-0'
                  >
                    View
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
