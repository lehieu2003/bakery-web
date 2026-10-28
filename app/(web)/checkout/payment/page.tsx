import type { Metadata } from 'next';
import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';
import { CheckoutCartGuard } from '@/components/screens/CheckoutCartGuard';

export const metadata: Metadata = {
  title: 'Thanh toán',
  description: 'Thanh toán đơn hàng Phương Loan Bakery.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPaymentPage() {
  return (
    <CheckoutCartGuard>
      <CheckoutPaymentScreen />
    </CheckoutCartGuard>
  );
}
