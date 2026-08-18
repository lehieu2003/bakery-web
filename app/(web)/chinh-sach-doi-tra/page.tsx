import type { Metadata } from 'next';
import ChinhSachDoiTraScreen from '@/components/screens/ChinhSachDoiTraScreen';

export const metadata: Metadata = {
  title: 'Chính sách đổi trả',
  description:
    'Chính sách đổi trả của Phương Loan Bakery: các trường hợp được đổi trả, quy trình xử lý và hình thức bồi hoàn rõ ràng, minh bạch.',
};

export default function ChinhSachDoiTraPage() {
  return <ChinhSachDoiTraScreen />;
}
