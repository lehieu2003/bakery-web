import type { Metadata } from 'next';
import DieuKhoanSuDungScreen from '@/components/screens/DieuKhoanSuDungScreen';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description:
    'Điều khoản sử dụng website phuongloan.vn: quy định về tài khoản, đặt hàng, sở hữu trí tuệ và giới hạn trách nhiệm.',
};

export default function DieuKhoanSuDungPage() {
  return <DieuKhoanSuDungScreen />;
}
