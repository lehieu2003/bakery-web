import type { Metadata } from 'next';
import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';

export const metadata: Metadata = {
  title: 'Thanh toán',
  description: 'Thanh toán đơn hàng Phương Loan Bakery.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPaymentPage() {
  return <CheckoutPaymentScreen />;
}
