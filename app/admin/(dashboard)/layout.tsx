import AdminRoleGuard from '@/components/admin/AdminRoleGuard';
import AdminShell from '@/components/admin/AdminShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Phương Loan Bakery Bakery Admin Panel',
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
  return (
    <AdminRoleGuard>
      <AdminShell>{children}</AdminShell>
    </AdminRoleGuard>
  );
}
