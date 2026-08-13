import AdminShell from '@/components/admin/AdminShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'La Douceur Bakery Admin Panel',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
