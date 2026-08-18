import type { Metadata } from 'next';
import ChinhSachGiaoHangScreen from '@/components/screens/ChinhSachGiaoHangScreen';

export const metadata: Metadata = {
  title: 'Chính sách giao hàng',
  description:
    'Tìm hiểu về chính sách giao hàng của Phương Loan Bakery: thời gian, phí vận chuyển, khu vực giao hàng và cam kết bảo quản sản phẩm.',
};

export default function ChinhSachGiaoHangPage() {
  return <ChinhSachGiaoHangScreen />;
}
