import { Suspense } from 'react';
import SearchScreen from '@/components/screens/SearchScreen';

export const metadata = {
  title: 'Tìm kiếm sản phẩm | La Douceur',
  description: 'Tìm kiếm bánh và sản phẩm tại La Douceur',
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
