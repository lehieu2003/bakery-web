'use client';

import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Cakes', href: '/cakes' },
  { label: 'Ingredients', href: '/ingredients' },
];

export default function WebNavbar() {
  const { user, cart } = useCart();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className='sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/60'>
      <div className='max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8'>
        {/* Logo */}
        <Link
          href='/'
          className='flex flex-col items-start leading-none flex-shrink-0'
          aria-label='Go to home'
        >
          <span className='font-serif text-xl font-semibold tracking-[0.12em] text-foreground uppercase'>
            La Douceur
          </span>
          <span className='text-[9px] tracking-[0.28em] text-muted-foreground uppercase font-light'>
            Artisan Bakery
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav
          className='hidden md:flex items-center gap-1'
          aria-label='Main navigation'
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className='flex items-center gap-2'>
          {/* Cart */}
          <Link
            href='/cart'
            className='relative p-2.5 rounded-full hover:bg-secondary transition-colors'
            aria-label={`Shopping cart, ${cartCount} items`}
          >
            <ShoppingBag size={20} className='text-foreground' />
            {cartCount > 0 && (
              <span className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1'>
                {cartCount}
              </span>
            )}
          </Link>

          {/* Profile */}
          {user ? (
            <Link
              href='/profile'
              className='flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-border hover:border-primary/40 transition-colors'
              aria-label='Profile'
            >
              <div className='w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0'>
                {user.name.charAt(0)}
              </div>
              <span className='hidden lg:block text-sm font-medium text-foreground'>
                {user.name.split(' ')[0]}
              </span>
              <span className='hidden lg:block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize'>
                {user.level}
              </span>
            </Link>
          ) : (
            <Link
              href='/profile'
              className='hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:border-primary/40 transition-colors'
              aria-label='Sign in'
            >
              <User size={16} />
              Sign In
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='md:hidden p-2.5 rounded-full hover:bg-secondary transition-colors'
            aria-label='Toggle menu'
          >
            {mobileMenuOpen ? (
              <X size={20} className='text-foreground' />
            ) : (
              <Menu size={20} className='text-foreground' />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-border/60 bg-background'>
          <nav className='max-w-7xl mx-auto px-6 py-4 space-y-2'>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                href='/profile'
                onClick={() => setMobileMenuOpen(false)}
                className='block px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors'
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
