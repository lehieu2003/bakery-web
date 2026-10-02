'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Loader2,
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  ArrowDownUp,
} from 'lucide-react';
import { useProductFilters, useProducts } from '@/hooks/use-products';
import {
  areFilterStateRecordsEqual,
  buildListingUrlSearchParams,
  parseListingUrlState,
} from '@/lib/search-filter-state';
import { getProductImage } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { Product, ProductFilterGroup, ProductFilterValueOption } from '@/types/api.types';

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'newest';

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'popular', label: 'Phổ biến nhất', icon: <TrendingUp size={14} /> },
  { value: 'newest', label: 'Mới nhất', icon: <ArrowDownUp size={14} /> },
  { value: 'price-asc', label: 'Giá tăng dần', icon: <TrendingUp size={14} /> },
  {
    value: 'price-desc',
    label: 'Giá giảm dần',
    icon: <TrendingDown size={14} />,
  },
];

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

export default function SearchScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialState = parseListingUrlState(
    new URLSearchParams(searchParams.toString()),
  );

  const [inputValue, setInputValue] = useState(initialState.search);
  const [query, setQuery] = useState(initialState.search);
  const [sort, setSort] = useState<SortOption>('popular');
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >(initialState.selectedFilters);
  const [priceMin, setPriceMin] = useState(initialState.minPrice);
  const [priceMax, setPriceMax] = useState(initialState.maxPrice);
  const [inStockOnly, setInStockOnly] = useState(initialState.inStockOnly);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL param → input when navigating here
  useEffect(() => {
    const next = parseListingUrlState(
      new URLSearchParams(searchParams.toString()),
    );
    const timer = setTimeout(() => {
      setQuery(next.search);
      setPriceMin(next.minPrice);
      setPriceMax(next.maxPrice);
      setInStockOnly(next.inStockOnly);
      setSelectedFilters((current) =>
        areFilterStateRecordsEqual(current, next.selectedFilters)
          ? current
          : next.selectedFilters,
      );
      setInputValue((current) => {
        const isUserTypingAhead =
          next.search === query && current.trim() !== query;
        return isUserTypingAhead ? current : next.search;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [query, searchParams]);

  const attributeFilters = Object.entries(selectedFilters)
    .filter(([, valueSlugs]) => valueSlugs.length > 0)
    .map(([attributeSlug, valueSlugs]) => ({
      attributeSlug,
      valueSlugs,
    }));

  const { data, isLoading } = useProducts(
    {
      search: query || undefined,
      limit: 48,
      minPrice: priceMin ? Number(priceMin) : undefined,
      maxPrice: priceMax ? Number(priceMax) : undefined,
      inStock: inStockOnly || undefined,
      attributeFilters,
    },
    {
      enabled:
        query.length >= 1 ||
        !!priceMin ||
        !!priceMax ||
        inStockOnly ||
        attributeFilters.length > 0,
    },
  );
  const { data: filterData } = useProductFilters();
  const rawProducts = (data?.products ?? []) as Product[];

  const products = rawProducts.filter((p: Product) => p.isActive);
  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return 0;
  });
  const filterGroups = filterData?.filters || [];
  const hasActiveFilters =
    !!priceMin ||
    !!priceMax ||
    inStockOnly ||
    Object.values(selectedFilters).some((value) => value.length > 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = e.target.value.trim();
      setQuery(trimmed);
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setQuery(trimmed);
  };

  useEffect(() => {
    const params = buildListingUrlSearchParams({
      search: query,
      page: 1,
      minPrice: priceMin,
      maxPrice: priceMax,
      inStockOnly,
      selectedFilters,
      subCategoryId: 'all',
    });
    const url = params.toString();
    router.replace(url ? `/search?${url}` : '/search', { scroll: false });
  }, [inStockOnly, priceMax, priceMin, query, router, selectedFilters]);

  const renderFilterPanel = () => (
    <div className='space-y-6'>
      <div>
        <div className='mb-2 flex items-center justify-between'>
          <p className='text-[11px] font-bold uppercase tracking-widest text-foreground'>
            Bộ lọc nhanh
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedFilters({});
                setPriceMin('');
                setPriceMax('');
                setInStockOnly(false);
              }}
              className='text-[11px] font-medium text-primary'
            >
              Xoá lọc
            </button>
          )}
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <input
            type='number'
            inputMode='numeric'
            value={priceMin}
            onChange={(event) => {
              setPriceMin(event.target.value);
            }}
            placeholder={
              filterData?.priceRange?.min
                ? String(Number(filterData.priceRange.min))
                : 'Từ giá'
            }
            className='h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary'
          />
          <input
            type='number'
            inputMode='numeric'
            value={priceMax}
            onChange={(event) => {
              setPriceMax(event.target.value);
            }}
            placeholder={
              filterData?.priceRange?.max
                ? String(Number(filterData.priceRange.max))
                : 'Đến giá'
            }
            className='h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary'
          />
        </div>

        <button
          onClick={() => {
            setInStockOnly((value) => !value);
          }}
          className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
            inStockOnly
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Chỉ hiện còn hàng
          <span className='text-[11px] font-semibold'>
            {inStockOnly ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {filterGroups.map((group: ProductFilterGroup) => {
        const selectedValueSlugs = selectedFilters[group.slug] || [];
        return (
          <div key={group.id}>
            <p className='mb-2.5 text-[11px] font-bold uppercase tracking-widest text-foreground'>
              {group.name}
            </p>
            <div className='space-y-2'>
              {group.values.map((value: ProductFilterValueOption) => {
                const active = selectedValueSlugs.includes(value.slug);
                return (
                  <label
                    key={value.id}
                    className='flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-1 text-sm text-foreground transition-colors hover:bg-secondary/60'
                  >
                    <div className='flex items-center gap-2.5'>
                      <Checkbox
                        checked={active}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          setSelectedFilters((prev) => {
                            const current = prev[group.slug] || [];
                            const nextValues = isChecked
                              ? [...current, value.slug]
                              : current.filter((slug) => slug !== value.slug);
                            return {
                              ...prev,
                              [group.slug]: nextValues,
                            };
                          });
                        }}
                      />
                      <span className='text-sm'>{value.label || value.value}</span>
                    </div>
                    <span className='text-xs text-muted-foreground'>
                      ({value.productCount})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

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
              placeholder='Bạn tìm gì ở Phương Loan Bakery?'
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
              {renderFilterPanel()}
              <div className='my-5 border-t border-border/40' />
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
                    <span
                      className={`flex-shrink-0 ${sort === value ? 'text-primary' : 'text-muted-foreground'}`}
                    >
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
          {/* mr-12 keeps the panel clear of the floating order button on the right edge */}
          <div className='mb-5 mr-12 rounded-2xl border border-border/60 bg-card p-4 lg:hidden'>
            <div className='mb-3 flex items-center gap-2'>
              <Search size={15} className='text-muted-foreground' />
              <p className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
                Bộ lọc
              </p>
            </div>
            {renderFilterPanel()}
          </div>

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

          {query.length === 0 && !hasActiveFilters ? (
            <div className='py-20 text-center text-muted-foreground'>
              <Search size={40} className='mx-auto mb-4 opacity-30' />
              <p className='text-base'>Nhập từ khóa để tìm sản phẩm</p>
            </div>
          ) : isLoading ? (
            <div>
              <div className='flex items-center gap-3 mb-6'>
                <Loader2 size={16} className='animate-spin text-primary' />
                <p className='text-sm text-muted-foreground'>
                  Đang tìm kiếm...
                </p>
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
                <span className='text-foreground font-semibold'>
                  &quot;{query}&quot;
                </span>
              </p>
              <p className='text-sm mt-2'>Hãy thử từ khóa khác.</p>
            </div>
          ) : (
            <>
              <div className='flex items-center justify-between mb-6'>
                <p className='text-sm text-muted-foreground'>
                  Tìm thấy{' '}
                  <span className='font-semibold text-foreground'>
                    {sorted.length}
                  </span>{' '}
                  sản phẩm
                  {query && (
                    <>
                      {' '}
                      cho{' '}
                      <span className='font-semibold text-foreground'>
                        &quot;{query}&quot;
                      </span>
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
