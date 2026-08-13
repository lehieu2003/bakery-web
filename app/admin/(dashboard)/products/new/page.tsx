'use client';

import { Suspense } from 'react';
import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className='text-xs text-muted-foreground'>Loading...</div>
        }
      >
        <ProductForm />
      </Suspense>
    </>
  );
}
