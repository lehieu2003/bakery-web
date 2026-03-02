import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin – La Douceur',
  description: 'La Douceur Bakery Admin Panel',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
