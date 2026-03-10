'use client';

import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useProducts, useCategories } from '@/hooks/use-products';
import { getProductImage } from '@/lib/utils';

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc';
const SORT_LABELS: Record<SortOption, string> = {
  popular: 'Most Popular',
  newest: 'Newest First',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
};

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

interface CategoryScreenProps {
  categorySlug: string;
}

export default function CategoryScreen({ categorySlug }: CategoryScreenProps) {
  const [sort, setSort] = useState<SortOption>('popular');
  const [subCategoryId, setSubCategoryId] = useState<string>('all');

  // Fetch categories and find the matching one by slug
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  const categoryData = categories.find((cat) => cat.slug === categorySlug);

  // Sub-categories from tree
  const subCategories = (categoryData as any)?.children || [];

  // Fetch products filtered by category
  const { data: productsData, isLoading } = useProducts({
    categoryId: categoryData?.id,
  });

  const products = (productsData?.products || []).filter((p) => {
    if (!p.isActive) return false;
    if (subCategoryId !== 'all') return p.categoryId === subCategoryId;
    return true;
  });
  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return 0;
  });

  const title = categoryData?.name || categorySlug;
  const subtitle = categoryData?.description || '';

  return (
    <div className='bg-background'>
      {/* Page header */}
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
          <Link
            href='/'
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5'
          >
            <ChevronLeft size={16} />
            Back to Home
          </Link>
          <h1 className='font-serif text-4xl font-semibold text-foreground mb-2'>
            {title}
          </h1>
          {subtitle && (
            <p className='text-muted-foreground text-sm max-w-lg leading-relaxed'>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex gap-10'>
        {/* Sidebar filters */}
        <aside className='hidden lg:block w-56 flex-shrink-0'>
          <div className='sticky top-24 space-y-8'>
            {/* Sub-categories */}
            {subCategories.length > 0 && (
              <div>
                <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                  Sub-categories
                </p>
                <div className='space-y-1'>
                  <button
                    onClick={() => setSubCategoryId('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      subCategoryId === 'all'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    All
                  </button>
                  {subCategories.map((sub: { id: string; name: string }) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubCategoryId(sub.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        subCategoryId === sub.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort */}
            <div>
              <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                Sort By
              </p>
              <div className='space-y-1'>
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
                  ([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSort(val)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sort === val
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <div className='flex-1 min-w-0'>
          {/* Mobile sub-category chips */}
          {subCategories.length > 0 && (
            <div className='lg:hidden flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide'>
              <button
                onClick={() => setSubCategoryId('all')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  subCategoryId === 'all'
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-muted-foreground bg-card'
                }`}
              >
                All
              </button>
              {subCategories.map((sub: { id: string; name: string }) => (
                <button
                  key={sub.id}
                  onClick={() => setSubCategoryId(sub.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    subCategoryId === sub.id
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground bg-card'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}

          {/* Mobile sort chips */}
          <div className='lg:hidden flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide'>
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
              ([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSort(val)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sort === val
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground bg-card'
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          <div className='flex items-center justify-between mb-6'>
            <p className='text-sm text-muted-foreground'>
              {sorted.length} products
            </p>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-3 gap-5'>
            {isLoading ? (
              // Loading skeleton
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className='bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse'
                >
                  <div className='w-full' style={{ paddingBottom: '100%' }}>
                    <div className='bg-secondary h-full' />
                  </div>
                  <div className='p-4 space-y-2'>
                    <div className='h-4 bg-secondary rounded' />
                    <div className='h-3 bg-secondary rounded w-2/3' />
                  </div>
                </div>
              ))
            ) : sorted.length > 0 ? (
              sorted.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className='bg-card rounded-2xl overflow-hidden border border-border/50 text-left hover:shadow-lg hover:border-border transition-all duration-300 group block'
                >
                  <div
                    className='relative w-full overflow-hidden bg-secondary'
                    style={{ paddingBottom: '100%' }}
                  >
                    <Image
                      src={getProductImage(p)}
                      alt={p.name}
                      fill
                      loading='lazy'
                      sizes='(max-width: 768px) 50vw, 33vw'
                      placeholder='blur'
                      blurDataURL={PLACEHOLDER_BLUR}
                      className='object-cover group-hover:scale-105 transition-transform duration-500'
                    />
                  </div>
                  <div className='p-4'>
                    <p className='font-sans text-sm font-semibold text-foreground leading-snug text-balance'>
                      {p.name}
                    </p>
                    {p.description && (
                      <p className='text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed'>
                        {p.description}
                      </p>
                    )}
                    <p className='font-sans text-base font-bold text-accent mt-2.5'>
                      {p.price.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className='col-span-full text-center py-12 text-muted-foreground'>
                No products available in this category
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
