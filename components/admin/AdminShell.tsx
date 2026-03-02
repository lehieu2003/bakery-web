'use client';

import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminShell({ children, title }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='min-h-screen bg-background flex'>
      {/* Desktop sidebar */}
      <aside className='hidden lg:flex lg:flex-col w-56 shrink-0 border-r border-border'>
        <AdminSidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/30 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-56 lg:hidden transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className='flex-1 flex flex-col min-w-0'>
        <AdminTopbar
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        <main className='flex-1 overflow-y-auto'>
          <div className='p-4 md:p-6 max-w-7xl mx-auto'>{children}</div>
        </main>
      </div>
    </div>
  );
}
