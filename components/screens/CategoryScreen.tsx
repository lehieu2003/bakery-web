'use client';

import Image from 'next/image';
import { ArrowDownUp, ChevronLeft, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useProducts, useCategories } from '@/hooks/use-products';
import { getProductImage } from '@/lib/utils';
import type { Category } from '@/types/api.types';

/** Recursively search the category tree by slug */
function findCategoryBySlug(categories: Category[], slug: string): Category | undefined {
  for (const cat of categories) {
    if (cat.slug === slug) return cat;
    if (cat.children?.length) {
      const found = findCategoryBySlug(cat.children, slug);
      if (found) return found;
    }
  }
  return undefined;
}

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'popular', label: 'Phổ biến nhất', icon: <TrendingUp size={14} /> },
  { value: 'newest', label: 'Mới nhất', icon: <ArrowDownUp size={14} /> },
  { value: 'price-asc', label: 'Giá tăng dần', icon: <TrendingUp size={14} /> },
  { value: 'price-desc', label: 'Giá giảm dần', icon: <TrendingDown size={14} /> },
];

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

interface CategoryScreenProps {
  categorySlug: string;
}

export default function CategoryScreen({ categorySlug }: CategoryScreenProps) {
  const [sort, setSort] = useState<SortOption>('popular');
  const [subCategoryId, setSubCategoryId] = useState<string>('all');

  // Fetch categories and find the matching one by slug (searches all levels)
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  const categoryData = findCategoryBySlug(categories, categorySlug);

  // Sub-categories from tree
  const subCategories = categoryData?.children || [];

  // Fetch products filtered by category — wait until categories are loaded
  // so we always query with the correct categoryId (never undefined).
  const { data: productsData, isLoading } = useProducts(
    { categoryId: categoryData?.id },
    { enabled: !!categoriesData },
  );

  const products = (productsData?.products || []).filter((p) => {
    if (!p.isActive) return false;
    if (subCategoryId !== 'all')
      return (p.categories || []).some((pc) => pc.categoryId === subCategoryId);
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
        <aside className='hidden lg:block w-60 flex-shrink-0'>
          <div className='sticky top-24 rounded-2xl border border-border/60 bg-card overflow-hidden'>
            <div className='px-5 py-4 border-b border-border/40 bg-secondary/30'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                Bộ lọc
              </p>
            </div>

            <div className='p-4 space-y-6'>
              {/* Sub-categories */}
              {subCategories.length > 0 && (
                <div>
                  <p className='text-[11px] font-bold text-foreground uppercase tracking-widest mb-2.5'>
                    Danh mục con
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    <button
                      onClick={() => setSubCategoryId('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        subCategoryId === 'all'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      Tất cả
                    </button>
                    {subCategories.map((sub: { id: string; name: string }) => (
                      <button
                        key={sub.id}
                        onClick={() => setSubCategoryId(sub.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          subCategoryId === sub.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {subCategories.length > 0 && (
                <div className='border-t border-border/40' />
              )}

              {/* Sort */}
              <div>
                <p className='text-[11px] font-bold text-foreground uppercase tracking-widest mb-2.5'>
                  Sắp xếp theo
                </p>
                <div className='space-y-1'>
                  {SORT_OPTIONS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setSort(value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        sort === value
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${sort === value ? 'text-primary' : 'text-muted-foreground'}`}>
                        {icon}
                      </span>
                      {label}
                      {sort === value && (
                        <span className='ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0' />
                      )}
                    </button>
                  ))}
                </div>
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
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground bg-card'
                }`}
              >
                Tất cả
              </button>
              {subCategories.map((sub: { id: string; name: string }) => (
                <button
                  key={sub.id}
                  onClick={() => setSubCategoryId(sub.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    subCategoryId === sub.id
                      ? 'bg-primary text-primary-foreground border-primary'
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
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sort === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground bg-card'
                }`}
              >
                {label}
              </button>
            ))}
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
