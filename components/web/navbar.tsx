'use client';

import {
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  User,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useCart } from '@/lib/cart-store';
import { useAuth } from '@/providers/auth-provider';
import { useCategories } from '@/hooks/use-products';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Category } from '@/types/api.types';

interface NavLink {
  label: string;
  href: string;
  children: {
    label: string;
    href: string;
    children: { label: string; href: string }[];
  }[];
}

export default function WebNavbar() {
  const { user, cart } = useCart();
  const { isLoading } = useAuth();
  const { data: categoriesData } = useCategories();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Build nav links dynamically from root categories, preserving children
  const navLinks = useMemo((): NavLink[] => {
    if (!categoriesData) return [];
    return categoriesData.map((cat: Category) => ({
      label: cat.name,
      href: `/categories/${cat.slug}`,
      children: (cat.children || []).map((child) => ({
        label: child.name,
        href: `/categories/${child.slug}`,
        children: (child.children || []).map((grand) => ({
          label: grand.name,
          href: `/categories/${grand.slug}`,
        })),
      })),
    }));
  }, [categoriesData]);

  const handleMouseEnter = (href: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(href);
  };

  const handleMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 120);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className='bg-white shadow-sm'>
      {/* Top bar */}
      <div className='bg-white border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8 h-9 flex items-center justify-between text-xs text-gray-500'>
          <div className='flex items-center gap-1'>
            <MapPin size={12} className='text-primary' />
            <span>Khu vực của bạn:</span>
            <a
              href='#'
              className='text-primary font-medium hover:underline ml-1'
            >
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
            <Link href='/blog' className='hover:text-primary transition-colors'>
              Blog
            </Link>
            <span className='text-gray-300'>|</span>
            <a href='#' className='hover:text-primary transition-colors'>
              Địa chỉ
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className='bg-white border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-6'>
          {/* Logo */}
          <Link href='/' className='flex-shrink-0' aria-label='Go to home'>
            <div className='flex flex-col items-center leading-none'>
              <span
                className='font-serif text-3xl font-bold text-primary tracking-tight'
                style={{ fontFamily: 'Georgia, serif' }}
              >
                La Douceur
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
              placeholder='Bạn tìm gì ở La Douceur?'
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
              <span className='hidden md:block text-sm font-medium'>
                {cartCount}
              </span>
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

      {/* Navigation bar + mega-menu container */}
      <div className='bg-white border-b border-gray-100 hidden md:block'>
        <div className='mx-auto px-4 lg:px-8'>
          <nav
            className='flex items-center justify-center overflow-x-auto scrollbar-hide'
            aria-label='Category navigation'
          >
            {navLinks.map((link) => (
              <div
                key={link.href}
                className='relative'
                onMouseEnter={() => handleMouseEnter(link.href)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Top-level nav item */}
                <Link
                  href={link.href}
                  className={`flex items-center gap-1 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                    isActive(link.href)
                      ? 'text-primary border-primary'
                      : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
                  }`}
                >
                  {link.label}
                  {link.children.length > 0 && (
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 flex-shrink-0 ${
                        activeDropdown === link.href
                          ? 'rotate-180 text-primary'
                          : 'text-gray-400'
                      }`}
                    />
                  )}
                </Link>

                {/* Mega-menu panel */}
                {link.children.length > 0 && activeDropdown === link.href && (
                  <div
                    className='fixed left-0 right-0 top-auto z-50 bg-white border-t border-gray-200 shadow-xl'
                    style={{ marginTop: 0 }}
                    onMouseEnter={() => handleMouseEnter(link.href)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className='max-w-7xl mx-auto px-4 lg:px-8 py-6'>
                      {/* Columns: each child is a column */}
                      <div
                        className='grid gap-x-8 gap-y-2'
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(link.children.length, 5)}, minmax(0, 1fr))`,
                        }}
                      >
                        {link.children.map((child) => (
                          <div key={child.href} className='min-w-0'>
                            {/* Column header → link to child category */}
                            <Link
                              href={child.href}
                              className={`block text-sm font-semibold mb-3 pb-1.5 border-b border-gray-100 transition-colors ${
                                isActive(child.href)
                                  ? 'text-primary'
                                  : 'text-gray-800 hover:text-primary'
                              }`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              {child.label}
                            </Link>

                            {/* Grandchildren list */}
                            <ul className='space-y-1.5'>
                              {child.children.length > 0
                                ? child.children.map((grand) => (
                                    <li key={grand.href}>
                                      <Link
                                        href={grand.href}
                                        className={`block text-sm leading-snug transition-colors ${
                                          isActive(grand.href)
                                            ? 'text-primary font-medium'
                                            : 'text-gray-600 hover:text-primary'
                                        }`}
                                        onClick={() => setActiveDropdown(null)}
                                      >
                                        {grand.label}
                                      </Link>
                                    </li>
                                  ))
                                : null}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link
              href='/blog'
              className={`flex items-center px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                isActive('/blog')
                  ? 'text-primary border-primary'
                  : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
              }`}
            >
              Blog
            </Link>
            <Link
              href='/thanh-vien'
              className={`flex items-center px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                isActive('/thanh-vien')
                  ? 'text-primary border-primary'
                  : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
              }`}
            >
              Thành viên
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-gray-100 bg-white shadow-lg'>
          <nav className='max-w-7xl mx-auto px-4 py-4 space-y-1'>
            {navLinks.map((link) => (
              <div key={link.href}>
                <div className='flex items-center'>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex-1 flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    <span className='uppercase tracking-wide'>
                      {link.label}
                    </span>
                  </Link>
                  {link.children.length > 0 && (
                    <button
                      onClick={() =>
                        setOpenMobileCategory(
                          openMobileCategory === link.href ? null : link.href,
                        )
                      }
                      className='p-2.5 text-gray-400 hover:text-primary transition-colors'
                      aria-label={`Toggle ${link.label} submenu`}
                    >
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${
                          openMobileCategory === link.href ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Mobile subcategories accordion */}
                {link.children.length > 0 &&
                  openMobileCategory === link.href && (
                    <div className='ml-4 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3'>
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
              </div>
            ))}
            <Link
              href='/blog'
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/blog')
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <span className='uppercase tracking-wide'>Blog</span>
            </Link>
            <Link
              href='/thanh-vien'
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/thanh-vien')
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <span className='uppercase tracking-wide'>Thành viên</span>
            </Link>
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
