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
import { useLogout } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

interface AdminTopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function AdminTopbar({ onMenuClick, title }: AdminTopbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const { user, logout: clearAuthUser } = useAuth();
  const { mutate: logout } = useLogout();
  const router = useRouter();

  const handleLogout = () => {
    // Clear user from auth provider first
    clearAuthUser();
    // Then call API logout
    logout();
  };

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
        <span className='font-serif text-sm font-semibold lg:hidden'>
          {title}
        </span>
      )}

      <div className='ml-auto flex items-center gap-2'>
        {/* Quick actions */}
        <Link href='/admin/products/new'>
          <Button size='sm' className='h-8 text-xs gap-1.5 hidden sm:flex'>
            <Plus size={13} />
            Add Product
          </Button>
        </Link>

        {/* Avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity'>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <div className='px-2 py-1.5'>
              <p className='text-xs font-medium'>{user?.name || 'Admin'}</p>
              <p className='text-[10px] text-muted-foreground'>
                {user?.email || 'Loading...'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-xs'
              onClick={() => router.push('/admin/settings')}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-xs text-destructive gap-2'
              onClick={handleLogout}
            >
              <LogOut size={12} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
