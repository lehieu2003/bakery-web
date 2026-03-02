'use client';

import { useState } from 'react';
import { Menu, Search, Plus, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface AdminTopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function AdminTopbar({ onMenuClick, title }: AdminTopbarProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className='h-14 border-b border-border bg-card flex items-center gap-3 px-4 sticky top-0 z-30'>
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className='lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground'
        aria-label='Open sidebar'
      >
        <Menu size={18} />
      </button>

      {/* Title (mobile) */}
      {title && (
        <span className='font-serif text-sm font-semibold lg:hidden'>{title}</span>
      )}

      {/* Search */}
      <div className='flex-1 max-w-sm hidden sm:flex relative'>
        <Search
          size={14}
          className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
        />
        <Input
          placeholder='Search products, orders...'
          className='pl-8 h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1 focus-visible:bg-background'
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div className='ml-auto flex items-center gap-2'>
        {/* Quick actions */}
        <Link href='/admin/products/new'>
          <Button size='sm' className='h-8 text-xs gap-1.5 hidden sm:flex'>
            <Plus size={13} />
            Add Product
          </Button>
        </Link>

        {/* Notifications */}
        <button className='relative p-1.5 rounded-md hover:bg-muted text-muted-foreground'>
          <Bell size={16} />
          <span className='absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full' />
        </button>

        {/* Avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity'>
              A
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <div className='px-2 py-1.5'>
              <p className='text-xs font-medium'>Admin</p>
              <p className='text-[10px] text-muted-foreground'>admin@ladouceur.vn</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-xs'>Profile</DropdownMenuItem>
            <DropdownMenuItem className='text-xs'>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-xs text-destructive gap-2'>
              <LogOut size={12} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
