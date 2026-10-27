import WebNavbar from '@/components/web/navbar';
import WebFooter from '@/components/web/footer';
import WebMain from '@/components/web/WebMain';
import { prisma } from '@/lib/prisma';
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { Suspense } from 'react';
import type { Category } from '@/types/api.types';

async function getCategories(): Promise<Category[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: true } },
        children: {
          where: { isActive: true },
          include: {
            _count: { select: { products: true } },
            children: {
              where: { isActive: true },
              include: { _count: { select: { products: true } } },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return categories.filter(
      (c) => c.parentId === null,
    ) as unknown as Category[];
  } catch {
    return [];
  }
}

export default async function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();

  const categories = await getCategories();

  // Pre-fill the React Query cache so the client never needs to fetch categories
  await queryClient.prefetchQuery({
    queryKey: ['categories'],
    queryFn: () => Promise.resolve(categories),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={null}>
        <WebNavbar />
      </Suspense>
      <WebMain>{children}</WebMain>
      <WebFooter />
    </HydrationBoundary>
  );
}
