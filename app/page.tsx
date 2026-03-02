'use client';

import { AppProvider, useApp } from '@/lib/store';
import WebNavbar from '@/components/ui-custom/WebNavbar';
import HomeScreen from '@/components/screens/HomeScreen';
import CategoryScreen from '@/components/screens/CategoryScreen';
import ProductDetailScreen from '@/components/screens/ProductDetailScreen';
import CartScreen from '@/components/screens/CartScreen';
import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';
import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';
import SuccessScreen from '@/components/screens/SuccessScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import AuthScreen from '@/components/screens/AuthScreen';

function AppRouter() {
  const { screen } = useApp();

  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <WebNavbar />
      <main className='flex-1'>
        {screen === 'home' && <HomeScreen />}
        {screen === 'category' && <CategoryScreen />}
        {screen === 'product-detail' && <ProductDetailScreen />}
        {screen === 'cart' && <CartScreen />}
        {screen === 'checkout-info' && <CheckoutInfoScreen />}
        {screen === 'checkout-payment' && <CheckoutPaymentScreen />}
        {screen === 'success' && <SuccessScreen />}
        {screen === 'profile' && <ProfileScreen />}
        {screen === 'auth' && <AuthScreen />}
      </main>
      <footer className='border-t border-border/60 bg-card mt-16'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4'>
          <div>
            <p className='font-serif text-base font-semibold tracking-wider uppercase text-foreground'>
              La Douceur
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Handcrafted Cakes for Every Celebration
            </p>
          </div>
          <p className='text-xs text-muted-foreground'>
            &copy; {new Date().getFullYear()} La Douceur Artisan Bakery. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
