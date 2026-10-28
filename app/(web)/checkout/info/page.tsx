import type { Metadata } from 'next';
import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';
import { CheckoutCartGuard } from '@/components/screens/CheckoutCartGuard';

export const metadata: Metadata = {
  title: 'Thông tin giao hàng',
  description: 'Nhập thông tin giao hàng cho đơn hàng Phương Loan Bakery.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutInfoPage() {
  return (
    <CheckoutCartGuard>
      <CheckoutInfoScreen />
    </CheckoutCartGuard>
  );
}
