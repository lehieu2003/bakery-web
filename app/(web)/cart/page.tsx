import type { Metadata } from 'next';
import CartScreen from '@/components/screens/CartScreen';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Xem và cập nhật giỏ hàng La Douceur.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartScreen />;
}
