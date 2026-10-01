import type { Metadata } from 'next';
import OrderDetailScreen from '@/components/screens/OrderDetailScreen';

export const metadata: Metadata = {
  title: 'Order Details | Phương Loan Bakery',
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  return <OrderDetailScreen orderNumber={orderNumber} />;
}
