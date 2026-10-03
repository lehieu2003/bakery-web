import type { Metadata } from 'next';
import VeChungToiScreen from '@/components/screens/VeChungToiScreen';

export const metadata: Metadata = {
  title: 'Về chúng tôi',
  description:
    'Tìm hiểu về Phương Loan Bakery – tiệm bánh thủ công tại Quảng Ngãi, phục vụ hơn 1.000 khách mỗi ngày với không gian ngồi lại thoải mái.',
};

export default function VeChungToiPage() {
  return <VeChungToiScreen />;
}
