'use client';

import AdminShell from '@/components/admin/AdminShell';
import ProductListView from '@/components/admin/ProductListView';

export default function CakesPage() {
  return (
    <AdminShell title='Cakes'>
      <ProductListView type='CAKE' title='Cakes' />
    </AdminShell>
  );
}
