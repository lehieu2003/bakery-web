'use client';

import AdminShell from '@/components/admin/AdminShell';
import ProductListView from '@/components/admin/ProductListView';

export default function IngredientsPage() {
  return (
    <AdminShell title='Ingredients'>
      <ProductListView type='INGREDIENT' title='Ingredients' />
    </AdminShell>
  );
}
