'use client';

import { ShoppingCart, Search, Phone, MapPin, User, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/lib/cart-store';
import { useAuth } from '@/providers/auth-provider';
import { useCategories } from '@/hooks/use-products';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function WebNavbar() {
  const { user, cart } = useCart();
  const { isLoading } = useAuth();
  const { data: categoriesData } = useCategories();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Build nav links dynamically from root categories
  const navLinks = useMemo(() => {
    const links: { label: string; href: string }[] = [];
    if (categoriesData) {
      for (const cat of categoriesData) {
        links.push({ label: cat.name, href: `/categories/${cat.slug}` });
      }
    }
    return links;
  }, [categoriesData]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className='sticky top-0 z-50 bg-white shadow-sm'>
      {/* Top bar */}
      <div className='bg-white border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8 h-9 flex items-center justify-between text-xs text-gray-500'>
          <div className='flex items-center gap-1'>
            <MapPin size={12} className='text-primary' />
            <span>Khu vực của bạn:</span>
            <a href='#' className='text-primary font-medium hover:underline ml-1'>
              Nội thành TP. HCM
            </a>
          </div>
          <div className='flex items-center gap-4'>
            <span>Giao hàng từ:</span>
            <a href='#' className='text-primary font-semibold hover:underline'>
              Chọn ngay
            </a>
          </div>
          <div className='hidden md:flex items-center gap-4'>
            <a href='#' className='hover:text-primary transition-colors'>Blog</a>
            <span className='text-gray-300'>|</span>
            <a href='#' className='hover:text-primary transition-colors'>Địa chỉ</a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className='bg-white border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-6'>
          {/* Logo */}
          <Link href='/' className='flex-shrink-0' aria-label='Go to home'>
            <div className='flex flex-col items-center leading-none'>
              <span className='font-serif text-3xl font-bold text-primary tracking-tight' style={{ fontFamily: 'Georgia, serif' }}>
                abby
              </span>
              <span className='text-[8px] tracking-widest text-gray-400 uppercase font-light -mt-0.5'>
                Make something different
              </span>
            </div>
          </Link>

          {/* Phone (desktop) */}
          <div className='hidden md:flex items-center gap-1.5 text-sm text-gray-600 flex-shrink-0'>
            <Phone size={14} className='text-primary' />
            <span className='font-medium'>1900 779907</span>
          </div>

          {/* Search bar */}
          <div className='flex-1 relative'>
            <input
              type='text'
              placeholder='Bạn tìm gì ở Abby'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full border border-gray-200 rounded-md px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors'
            />
            <button
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors'
              aria-label='Search'
            >
              <Search size={18} />
            </button>
          </div>

          {/* Right actions */}
          <div className='flex items-center gap-3 flex-shrink-0'>
            {/* Cart */}
            <Link
              href='/cart'
              className='relative flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors'
              aria-label={`Shopping cart, ${cartCount} items`}
            >
              <div className='relative'>
                <ShoppingCart size={26} />
                {cartCount > 0 && (
                  <span className='absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1'>
                    {cartCount}
                  </span>
                )}
              </div>
              <span className='hidden md:block text-sm font-medium'>{cartCount}</span>
            </Link>

            {/* Profile */}
            {mounted && user ? (
              <Link
                href='/profile'
                className='flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-primary/50 transition-colors'
                aria-label='Profile'
              >
                <div className='w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0'>
                  {user.name.charAt(0)}
                </div>
                <span className='hidden lg:block text-sm font-medium text-gray-700'>
                  {user.name.split(' ')[0]}
                </span>
              </Link>
            ) : mounted && !isLoading ? (
              <Link
                href='/auth'
                className='hidden md:flex items-center gap-1.5 px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors'
                aria-label='Sign in'
              >
                <User size={15} />
                Đăng nhập
              </Link>
            ) : null}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors'
              aria-label='Toggle menu'
            >
              {mobileMenuOpen ? (
                <X size={20} className='text-gray-600' />
              ) : (
                <Menu size={20} className='text-gray-600' />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className='bg-white border-b border-gray-100 hidden md:block'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8'>
          <nav className='flex items-center' aria-label='Category navigation'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                  isActive(link.href)
                    ? 'text-primary border-primary'
                    : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                {link.label}
                <ChevronDown size={13} className='text-gray-400' />
              </Link>
            ))}
            {/* Static workshop link */}
            <Link
              href='/'
              className='px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-700 border-b-2 border-transparent hover:text-primary hover:border-primary transition-colors'
            >
              Workshop
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-gray-100 bg-white shadow-lg'>
          <nav className='max-w-7xl mx-auto px-4 py-4 space-y-1'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                }`}
              >
                <span className='uppercase tracking-wide'>{link.label}</span>
                <ChevronDown size={14} className='text-gray-400' />
              </Link>
            ))}
            {!user && !isLoading && (
              <Link
                href='/auth'
                onClick={() => setMobileMenuOpen(false)}
                className='flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors'
              >
                <User size={15} />
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
