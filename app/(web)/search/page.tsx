import { Suspense } from 'react';
import SearchScreen from '@/components/screens/SearchScreen';

export const metadata = {
  title: 'Tìm kiếm sản phẩm',
  description: 'Tìm kiếm bánh và sản phẩm tại Phương Loan Bakery',
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
