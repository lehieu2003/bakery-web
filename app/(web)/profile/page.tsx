import type { Metadata } from 'next';
import ProfileScreen from '@/components/screens/ProfileScreen';

export const metadata: Metadata = {
  title: 'Tài khoản',
  description: 'Quản lý tài khoản và đơn hàng La Douceur.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
