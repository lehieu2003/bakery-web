'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Search, Eye, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { mockCustomers, formatVND, MEMBER_LEVEL_COLORS, MemberLevel } from '@/lib/admin-data';
import { cn } from '@/lib/utils';

type LevelFilter = 'ALL' | MemberLevel;

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');

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
              <tr key={customer.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
                      <span className='text-xs font-semibold text-primary'>
                        {customer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className='text-xs font-medium text-foreground'>{customer.name}</p>
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
                  <span className='text-xs text-muted-foreground'>{customer.totalOrders}</span>
                </td>
                <td className='px-5 py-3.5 hidden lg:table-cell'>
                  <span className='text-xs font-medium text-foreground'>
                    {formatVND(customer.totalSpent)}
                  </span>
                </td>
                <td className='px-5 py-3.5'>
                  <Button variant='ghost' size='sm' className='h-7 text-xs gap-1'>
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
    </AdminShell>
  );
}
