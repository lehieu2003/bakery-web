import { Suspense } from 'react';

import CategoryScreen from '@/components/screens/CategoryScreen';

export default function IngredientsPage() {
  return (
    <Suspense fallback={null}>
      <CategoryScreen slugPath={['ingredients']} />
    </Suspense>
  );
}
