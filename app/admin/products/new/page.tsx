'use client';

import { Suspense } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <AdminShell title='Add Product'>
      <Suspense fallback={<div className='text-xs text-muted-foreground'>Loading...</div>}>
        <ProductForm />
      </Suspense>
    </AdminShell>
  );
}
