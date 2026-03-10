'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  ListTree,
  ShoppingCart,
  Image,
  Users,
  Settings,
  X,
  Crown,
  FileText,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: <LayoutDashboard size={16} />,
  },
  {
    label: 'Products',
    href: '/admin/products',
    icon: <ShoppingBag size={16} />,
  },
  {
    label: 'Categories',
    href: '/admin/categories',
    icon: <ListTree size={16} />,
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: <ShoppingCart size={16} />,
  },
  {
    label: 'Banners',
    href: '/admin/banners',
    icon: <Image size={16} />,
  },
  // Blog section
  {
    label: 'Blog',
    href: '/admin/blog/posts',
    icon: <FileText size={16} />,
    children: [
      {
        label: 'Bài viết',
        href: '/admin/blog/posts',
        icon: <FileText size={14} />,
      },
      {
        label: 'Danh mục',
        href: '/admin/blog/categories',
        icon: <ListTree size={14} />,
      },
      {
        label: 'Tags',
        href: '/admin/blog/tags',
        icon: <Menu size={14} />,
      },
    ],
  },
  {
    label: 'Pages',
    href: '/admin/pages',
    icon: <FileText size={16} />,
  },
  {
    label: 'Menu',
    href: '/admin/menu',
    icon: <Menu size={16} />,
  },
  {
    label: 'Membership',
    href: '/admin/membership',
    icon: <Crown size={16} />,
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    icon: <Users size={16} />,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: <Settings size={16} />,
  },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className='flex flex-col h-full bg-sidebar text-sidebar-foreground'>
      {/* Logo */}
      <div className='flex items-center justify-between px-5 py-5 border-b border-sidebar-border'>
        <div>
          <p className='font-serif text-base font-semibold tracking-wide text-sidebar-foreground'>
            La Douceur
          </p>
          <p className='text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5'>
            Admin Panel
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className='lg:hidden p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground'
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className='flex-1 overflow-y-auto py-4 px-3'>
        <ul className='space-y-0.5'>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
              {item.children && (
                <ul className='mt-0.5 ml-3 space-y-0.5'>
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          isActive(child.href)
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className='px-4 py-4 border-t border-sidebar-border'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold'>
            A
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-xs font-medium text-sidebar-foreground truncate'>
              Admin
            </p>
            <p className='text-[10px] text-muted-foreground truncate'>
              admin@ladouceur.vn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
