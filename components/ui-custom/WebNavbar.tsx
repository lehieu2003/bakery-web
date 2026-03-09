'use client';

import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/lib/store';

const NAV_LINKS = [
  { label: 'Home', screen: 'home' as const },
  { label: 'Cakes', screen: 'category' as const, cat: 'cake' as const },
  {
    label: 'Ingredients',
    screen: 'category' as const,
    cat: 'ingredient' as const,
  },
];

export default function WebNavbar() {
  const { navigate, setCategory, screen, user, cart } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function handleNavClick(link: (typeof NAV_LINKS)[number]) {
    if (link.cat) {
      setCategory(link.cat);
    } else {
      navigate(link.screen);
    }
    setMobileMenuOpen(false);
  }

  const isActive = (link: (typeof NAV_LINKS)[number]) => {
    if (link.screen === 'home') return screen === 'home';
    return false;
  };

  return (
    <header className='sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/60'>
      <div className='max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8'>
        {/* Logo */}
        <button
          onClick={() => navigate('home')}
          className='flex flex-col items-start leading-none flex-shrink-0'
          aria-label='Go to home'
        >
          <span className='font-serif text-xl font-semibold tracking-[0.12em] text-foreground uppercase'>
            La Douceur
          </span>
          <span className='text-[9px] tracking-[0.28em] text-muted-foreground uppercase font-light'>
            Artisan Bakery
          </span>
        </button>

        {/* Desktop Nav */}
        <nav
          className='hidden md:flex items-center gap-1'
          aria-label='Main navigation'
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive(link)
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className='flex items-center gap-2'>
          {/* Cart */}
          <button
            onClick={() => navigate('cart')}
            className='relative p-2.5 rounded-full hover:bg-secondary transition-colors'
            aria-label={`Shopping cart, ${cartCount} items`}
          >
            <ShoppingBag size={20} className='text-foreground' />
            {cartCount > 0 && (
              <span className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1'>
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile */}
          {user ? (
            <button
              onClick={() => navigate('profile')}
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
            </button>
          ) : (
            <button
              onClick={() => navigate('profile')}
              className='hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:border-primary/40 transition-colors'
              aria-label='Sign in'
            >
              <User size={15} />
              Sign In
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='md:hidden p-2.5 rounded-full hover:bg-secondary transition-colors'
            aria-label='Toggle menu'
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-border/60 bg-background px-6 py-4 space-y-1'>
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className='w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors'
            >
              {link.label}
            </button>
          ))}
          {!user && (
            <button
              onClick={() => {
                navigate('profile');
                setMobileMenuOpen(false);
              }}
              className='w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-secondary transition-colors'
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}
    </header>
  );
}
