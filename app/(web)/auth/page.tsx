import type { Metadata } from 'next';
import AuthScreen from '@/components/screens/AuthScreen';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập hoặc tạo tài khoản La Douceur.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthPage() {
  return <AuthScreen />;
}
