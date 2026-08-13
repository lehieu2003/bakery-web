import type { Metadata } from 'next';
import LoginScreenAdmin from '@/components/screens/LoginScreenAdmin';

export const metadata: Metadata = {
  title: 'Admin Login',
  description: 'Đăng nhập trang quản trị La Douceur.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return <LoginScreenAdmin />;
}
