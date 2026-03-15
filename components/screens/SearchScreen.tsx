'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronLeft, TrendingDown, TrendingUp, ArrowDownUp } from 'lucide-react';
import { useProducts } from '@/hooks/use-products';
import { getProductImage } from '@/lib/utils';

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'popular', label: 'Phổ biến nhất', icon: <TrendingUp size={14} /> },
  { value: 'newest', label: 'Mới nhất', icon: <ArrowDownUp size={14} /> },
  { value: 'price-asc', label: 'Giá tăng dần', icon: <TrendingUp size={14} /> },
  { value: 'price-desc', label: 'Giá giảm dần', icon: <TrendingDown size={14} /> },
];

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

export default function SearchScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortOption>('popular');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL param → input when navigating here
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const timer = setTimeout(() => {
      setInputValue(q);
      setQuery(q);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const { data, isLoading } = useProducts(
    { search: query, limit: 48 },
    { enabled: query.length >= 1 },
  );
  const rawProducts = data?.products ?? [];

  const products = rawProducts.filter((p) => p.isActive);
  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return 0;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = e.target.value.trim();
      setQuery(trimmed);
      // Keep URL in sync without hard navigation
      router.replace(
        trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search',
        { scroll: false },
      );
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setQuery(trimmed);
    if (trimmed) router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className='bg-background min-h-screen'>
      {/* Page header */}
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
          <Link
            href='/'
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5'
          >
            <ChevronLeft size={16} />
            Quay lại trang chủ
          </Link>
          <h1 className='font-serif text-4xl font-semibold text-foreground mb-6'>
            Tìm kiếm sản phẩm
          </h1>

          {/* Search input */}
          <form onSubmit={handleSubmit} className='relative max-w-2xl'>
            <input
              type='text'
              value={inputValue}
              onChange={handleInputChange}
              placeholder='Bạn tìm gì ở La Douceur?'
              autoFocus
              className='w-full border border-border rounded-xl px-5 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
            />
            <button
              type='submit'
              className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors'
              aria-label='Tìm kiếm'
            >
              {isLoading ? (
                <Loader2 size={18} className='animate-spin' />
              ) : (
                <Search size={18} />
              )}
            </button>
          </form>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex gap-10'>
        {/* Sidebar sort */}
        <aside className='hidden lg:block w-60 flex-shrink-0'>
          <div className='sticky top-24 rounded-2xl border border-border/60 bg-card overflow-hidden'>
            <div className='px-5 py-4 border-b border-border/40 bg-secondary/30'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                Sắp xếp
              </p>
            </div>
            <div className='p-4'>
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
        </aside>

        {/* Results grid */}
        <div className='flex-1 min-w-0'>
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

          {query.length === 0 ? (
            <div className='py-20 text-center text-muted-foreground'>
              <Search size={40} className='mx-auto mb-4 opacity-30' />
              <p className='text-base'>Nhập từ khóa để tìm sản phẩm</p>
            </div>
          ) : isLoading ? (
            <div>
              <div className='flex items-center gap-3 mb-6'>
                <Loader2 size={16} className='animate-spin text-primary' />
                <p className='text-sm text-muted-foreground'>Đang tìm kiếm...</p>
              </div>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-5'>
                {[...Array(6)].map((_, i) => (
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
                ))}
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className='py-20 text-center text-muted-foreground'>
              <Search size={40} className='mx-auto mb-4 opacity-30' />
              <p className='text-base'>
                Không tìm thấy sản phẩm nào cho{' '}
                <span className='text-foreground font-semibold'>&quot;{query}&quot;</span>
              </p>
              <p className='text-sm mt-2'>Hãy thử từ khóa khác.</p>
            </div>
          ) : (
            <>
              <div className='flex items-center justify-between mb-6'>
                <p className='text-sm text-muted-foreground'>
                  Tìm thấy <span className='font-semibold text-foreground'>{sorted.length}</span> sản phẩm
                  {query && (
                    <>
                      {' '}cho{' '}
                      <span className='font-semibold text-foreground'>&quot;{query}&quot;</span>
                    </>
                  )}
                </p>
              </div>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-5'>
                {sorted.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
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
                      {p.shortDescription && (
                        <p className='text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed'>
                          {p.shortDescription}
                        </p>
                      )}
                      <p className='font-sans text-base font-bold text-accent mt-2.5'>
                        {p.price.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
