'use client';

import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useProducts, useCategories } from '@/hooks/use-products';

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc';
const SORT_LABELS: Record<SortOption, string> = {
  popular: 'Most Popular',
  newest: 'Newest First',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
};

const PRICE_FILTERS = [
  'All',
  'Under 100k',
  '100k – 300k',
  '300k – 600k',
  'Above 600k',
];
const BRANDS = ['All', 'Valrhona', 'Nielsen-Massey', "Bob's Red Mill"];

interface CategoryScreenProps {
  category: 'cakes' | 'ingredients';
}

export default function CategoryScreen({ category }: CategoryScreenProps) {
  const [sort, setSort] = useState<SortOption>('popular');
  const [priceFilter, setPriceFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');

  // Fetch categories and products
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  // Find category ID based on category slug
  const categoryData = categories.find(
    (cat: { slug: string; name: string; id: string }) =>
      cat.slug === category ||
      cat.slug.toLowerCase() === category.toLowerCase(),
  );

  // Fetch products filtered by category
  const { data: productsData, isLoading } = useProducts({
    categoryId: categoryData?.id,
  });

  const products = (productsData?.products || []).filter((p) => p.isActive);
  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return 0;
  });

  const title = category === 'cakes' ? 'Signature Cakes' : 'Baking Ingredients';
  const subtitle =
    category === 'cakes'
      ? 'Handcrafted to order, every cake is made with premium ingredients and artisan care.'
      : 'Professional-grade baking ingredients sourced from trusted suppliers worldwide.';

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
          <p className='text-muted-foreground text-sm max-w-lg leading-relaxed'>
            {subtitle}
          </p>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex gap-10'>
        {/* Sidebar filters */}
        <aside className='hidden lg:block w-56 flex-shrink-0'>
          <div className='sticky top-24 space-y-8'>
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

            {/* Price filter */}
            <div>
              <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                Price Range
              </p>
              <div className='space-y-1'>
                {PRICE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPriceFilter(f)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      priceFilter === f
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand (ingredients only) */}
            {category === 'ingredients' && (
              <div>
                <p className='text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                  Brand
                </p>
                <div className='space-y-1'>
                  {BRANDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBrandFilter(b)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        brandFilter === b
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Product grid */}
        <div className='flex-1 min-w-0'>
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
                      src={p.imageUrl || '/images/placeholder.jpg'}
                      alt={p.name}
                      fill
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
