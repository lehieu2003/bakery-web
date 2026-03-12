import type { Metadata } from 'next';
import ChinhSachBaoMatScreen from '@/components/screens/ChinhSachBaoMatScreen';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật | La Douceur',
  description:
    'Chính sách bảo mật của La Douceur: cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.',
};

export default function ChinhSachBaoMatPage() {
  return <ChinhSachBaoMatScreen />;
}
