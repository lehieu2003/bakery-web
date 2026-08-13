import type { Metadata } from 'next';
import SuccessScreen from '@/components/screens/SuccessScreen';

export const metadata: Metadata = {
  title: 'Đặt hàng thành công',
  description: 'Xác nhận đơn hàng La Douceur.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.order || 'N/A';
  return <SuccessScreen orderNumber={orderNumber} />;
}
