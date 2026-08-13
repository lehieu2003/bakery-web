import type { Metadata } from 'next';
import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';

export const metadata: Metadata = {
  title: 'Thông tin giao hàng',
  description: 'Nhập thông tin giao hàng cho đơn hàng La Douceur.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutInfoPage() {
  return <CheckoutInfoScreen />;
}
