import type { Metadata } from 'next';
import VeChungToiScreen from '@/components/screens/VeChungToiScreen';

export const metadata: Metadata = {
  title: 'Về chúng tôi',
  description:
    'Tìm hiểu về La Douceur – tiệm bánh thủ công ra đời năm 2013 tại TP.HCM với hơn 8 chi nhánh, phục vụ hơn 1.000 khách mỗi ngày.',
};

export default function VeChungToiPage() {
  return <VeChungToiScreen />;
}
