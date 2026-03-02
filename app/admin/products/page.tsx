'use client';

import AdminShell from '@/components/admin/AdminShell';
import ProductListView from '@/components/admin/ProductListView';

export default function ProductsPage() {
  return (
    <AdminShell title='Products'>
      <div className='space-y-8'>
        <ProductListView type='CAKE' title='Cakes' />
        <ProductListView type='INGREDIENT' title='Ingredients' />
      </div>
    </AdminShell>
  );
}
