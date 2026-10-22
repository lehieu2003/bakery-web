import type { Metadata } from 'next';
import DeleteAccountScreen from '@/components/screens/DeleteAccountScreen';

export const metadata: Metadata = {
  title: 'Xóa tài khoản',
  description:
    'Hướng dẫn và yêu cầu xóa tài khoản Phương Loan Bakery cùng dữ liệu cá nhân liên quan.',
};

export default function XoaTaiKhoanPage() {
  return <DeleteAccountScreen />;
}
