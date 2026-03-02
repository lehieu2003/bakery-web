'use client';

import AdminShell from '@/components/admin/AdminShell';
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  Plus,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  mockOrders,
  formatVND,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
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

const kpiCards = [
  {
    label: "Today's Orders",
    value: '24',
    sub: '+3 from yesterday',
    icon: <ShoppingCart size={18} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Revenue Today',
    value: '₫ 18.4M',
    sub: '+12% vs last week',
    icon: <TrendingUp size={18} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Pending Orders',
    value: '6',
    sub: '2 require action',
    icon: <Clock size={18} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    label: 'Top Product',
    value: 'Rose Garden',
    sub: '38 sold this week',
    icon: <Star size={18} />,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
];

const chartData = [
  { day: 'Mon', orders: 18, revenue: 14200000 },
  { day: 'Tue', orders: 22, revenue: 17800000 },
  { day: 'Wed', orders: 15, revenue: 11500000 },
  { day: 'Thu', orders: 28, revenue: 22400000 },
  { day: 'Fri', orders: 31, revenue: 26100000 },
  { day: 'Sat', orders: 42, revenue: 35600000 },
  { day: 'Sun', orders: 36, revenue: 29800000 },
];

const formatRevenue = (val: number) => `₫${(val / 1000000).toFixed(1)}M`;

const latestOrders = mockOrders.slice(0, 5);

export default function DashboardPage() {
  return (
    <AdminShell title='Dashboard'>
      {/* Page header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Dashboard</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Sunday, March 2, 2026
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link href='/admin/products/new'>
            <Button size='sm' className='h-8 text-xs gap-1.5'>
              <Plus size={13} />
              Add Product
            </Button>
          </Link>
          <Link href='/admin/banners/new'>
            <Button size='sm' variant='outline' className='h-8 text-xs gap-1.5'>
              <Image size={13} />
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
              <p className='text-xs text-muted-foreground font-medium'>{card.label}</p>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
            </div>
            <p className='font-serif text-xl font-semibold text-foreground'>{card.value}</p>
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
              <p className='text-sm font-semibold text-foreground'>Orders (Last 7 days)</p>
              <p className='text-[10px] text-muted-foreground'>Total: 192 orders</p>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={160}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id='ordersGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.2} />
                  <stop offset='95%' stopColor='var(--color-primary)' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--color-border)' />
              <XAxis dataKey='day' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)' }}
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
              <p className='text-sm font-semibold text-foreground'>Revenue (Last 7 days)</p>
              <p className='text-[10px] text-muted-foreground'>Total: ₫157.4M</p>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={160}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id='revenueGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#10b981' stopOpacity={0.2} />
                  <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--color-border)' />
              <XAxis dataKey='day' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)' }}
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
            <Button variant='ghost' size='sm' className='h-7 text-xs gap-1 text-muted-foreground hover:text-foreground'>
              View all
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
        <div className='divide-y divide-border'>
          {latestOrders.map((order) => (
            <div key={order.id} className='flex items-center gap-4 px-5 py-3'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className='text-xs font-semibold text-foreground'>{order.orderCode}</p>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ORDER_STATUS_COLORS[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className='text-[10px] text-muted-foreground mt-0.5'>
                  {order.customerName} · {order.createdAt}
                </p>
              </div>
              <p className='text-xs font-semibold text-foreground shrink-0'>
                {formatVND(order.total)}
              </p>
              <Link href={`/admin/orders/${order.id}`}>
                <Button variant='ghost' size='sm' className='h-7 text-xs shrink-0'>
                  View
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
