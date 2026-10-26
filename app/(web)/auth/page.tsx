import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthScreen from '@/components/screens/AuthScreen';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập hoặc tạo tài khoản Phương Loan Bakery.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}
