'use client';

import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useProductFilters,
  useProducts,
  useCategories,
} from '@/hooks/use-products';
import {
  categoryHrefFromTrail,
  findCategoryTrailBySlugPath,
} from '@/lib/category-path';
import {
  areFilterStateRecordsEqual,
  buildListingUrlSearchParams,
  parseListingUrlState,
} from '@/lib/search-filter-state';
import { Checkbox } from '@/components/ui/checkbox';
import ProductCard from '@/components/screens/ProductCard';
import type { ProductFilterGroup, ProductFilterValueOption } from '@/types/api.types';

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc';

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

interface CategoryScreenProps {
  slugPath: string[];
}

const PAGE_SIZE = 12;

export default function CategoryScreen({ slugPath }: CategoryScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialUrlState = useMemo(
    () => parseListingUrlState(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [keyword, setKeyword] = useState(initialUrlState.search);
  const [sort, setSort] = useState<SortOption>('popular');
  const [subCategoryId, setSubCategoryId] = useState<string>(
    initialUrlState.subCategoryId,
  );
  const [page, setPage] = useState(initialUrlState.page);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >(initialUrlState.selectedFilters);
  const [priceMin, setPriceMin] = useState(initialUrlState.minPrice);
  const [priceMax, setPriceMax] = useState(initialUrlState.maxPrice);
  const [inStockOnly, setInStockOnly] = useState(initialUrlState.inStockOnly);

  // Fetch categories and resolve category from slug path.
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];
  const categoryTrail = findCategoryTrailBySlugPath(categories, slugPath) || [];
  const categoryData = categoryTrail[categoryTrail.length - 1];
  const parentCategory = categoryTrail[categoryTrail.length - 2];
  const isCategoryResolved = !!categoryData;
  const shouldShowInvalidCategory =
    !!categoriesData && !isCategoryResolved && slugPath.length > 0;

  // Sub-categories from tree
  const subCategories = categoryData?.children || [];

  // Fetch products filtered by category — wait until categories are loaded
  // so we always query with the correct categoryId (never undefined).
  const attributeFilters = Object.entries(selectedFilters)
    .filter(([, valueSlugs]) => valueSlugs.length > 0)
    .map(([attributeSlug, valueSlugs]) => ({
      attributeSlug,
      valueSlugs,
    }));

  const effectiveCategoryId =
    subCategoryId !== 'all' ? subCategoryId : categoryData?.id;

  const { data: productsData, isLoading } = useProducts(
    {
      categoryId: effectiveCategoryId,
      search: keyword || undefined,
      page,
      limit: PAGE_SIZE,
      minPrice: priceMin ? Number(priceMin) : undefined,
      maxPrice: priceMax ? Number(priceMax) : undefined,
      inStock: inStockOnly || undefined,
      attributeFilters,
    },
    { enabled: !!effectiveCategoryId },
  );
  const { data: filterData } = useProductFilters(
    { categoryId: effectiveCategoryId },
    { enabled: !!effectiveCategoryId },
  );

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;
  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return 0;
  });

  const rawLastSlug = slugPath[slugPath.length - 1] || '';
  const decodedLastSlug = (() => {
    try {
      return decodeURIComponent(rawLastSlug);
    } catch {
      return rawLastSlug;
    }
  })();
  const title = categoryData?.name || decodedLastSlug;
  const subtitle = categoryData?.description || '';
  const filterGroups = filterData?.filters || [];
  const hasActiveFilters =
    !!keyword ||
    inStockOnly ||
    !!priceMin ||
    !!priceMax ||
    Object.values(selectedFilters).some((values) => values.length > 0);

  useEffect(() => {
    const next = parseListingUrlState(new URLSearchParams(searchParams.toString()));
    const timer = setTimeout(() => {
      setKeyword((current) => (current === next.search ? current : next.search));
      setPage((current) => (current === next.page ? current : next.page));
      setPriceMin((current) =>
        current === next.minPrice ? current : next.minPrice,
      );
      setPriceMax((current) =>
        current === next.maxPrice ? current : next.maxPrice,
      );
      setInStockOnly((current) =>
        current === next.inStockOnly ? current : next.inStockOnly,
      );
      setSubCategoryId((current) =>
        current === next.subCategoryId ? current : next.subCategoryId,
      );
      setSelectedFilters((current) =>
        areFilterStateRecordsEqual(current, next.selectedFilters)
          ? current
          : next.selectedFilters,
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    const params = buildListingUrlSearchParams(
      {
        search: keyword,
        page,
        minPrice: priceMin,
        maxPrice: priceMax,
        inStockOnly,
        subCategoryId,
        selectedFilters,
      },
      { includeSubCategory: true },
    );
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    inStockOnly,
    keyword,
    page,
    pathname,
    priceMax,
    priceMin,
    router,
    selectedFilters,
    subCategoryId,
  ]);

  const handleSelectSubCategory = (nextId: string) => {
    setSubCategoryId(nextId);
    setPage(1);
  };

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
                setKeyword('');
                setSelectedFilters({});
                setPriceMin('');
                setPriceMax('');
                setInStockOnly(false);
                setPage(1);
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
              setPage(1);
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
              setPage(1);
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
            setPage(1);
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
                          setPage(1);
                        }}
                      />
                      <span className='text-sm'>{value.label}</span>
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
    <div className='bg-background'>
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
          <Link
            href={parentCategory ? categoryHrefFromTrail(categoryTrail.slice(0, -1)) : '/'}
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5'
          >
            <ChevronLeft size={16} />
            {parentCategory ? `Back to ${parentCategory.name}` : 'Back to Home'}
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
        {shouldShowInvalidCategory ? (
          <div className='w-full rounded-2xl border border-border/50 bg-card p-8 text-center'>
            <h2 className='font-serif text-2xl font-semibold text-foreground mb-2'>
              Category Not Found
            </h2>
            <p className='text-sm text-muted-foreground mb-5'>
              The requested category does not exist or is no longer available.
            </p>
            <Link
              href='/'
              className='inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90'
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <>
        {/* Sidebar filters */}
        <aside className='hidden lg:block w-60 flex-shrink-0'>
          <div className='sticky top-24 rounded-2xl border border-border/60 bg-card overflow-hidden'>
            <div className='px-5 py-4 border-b border-border/40 bg-secondary/30'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
                Bộ lọc
              </p>
            </div>

            <div className='p-4 space-y-6'>
              <div>
                <p className='mb-2 text-[11px] font-bold uppercase tracking-widest text-foreground'>
                  Từ khóa
                </p>
                <div className='relative'>
                  <Search
                    size={16}
                    className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
                  />
                  <input
                    type='text'
                    value={keyword}
                    onChange={(event) => {
                      setKeyword(event.target.value);
                      setPage(1);
                    }}
                    placeholder='Tìm trong danh mục này'
                    className='h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary'
                  />
                </div>
              </div>

              {renderFilterPanel()}

              <div className='border-t border-border/40' />

              {/* Sub-categories */}
              {subCategories.length > 0 && (
                <div>
                  <p className='text-[11px] font-bold text-foreground uppercase tracking-widest mb-2.5'>
                    Danh mục con
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    <button
                      onClick={() => handleSelectSubCategory('all')}
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
                        onClick={() => handleSelectSubCategory(sub.id)}
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
          </div>
        </aside>

        {/* Product grid */}
        <div className='flex-1 min-w-0'>
          <div className='mb-5 rounded-2xl border border-border/60 bg-card p-4 lg:hidden'>
            <label className='mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
              Từ khóa
            </label>
            <div className='relative'>
              <Search
                size={16}
                className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
              />
              <input
                type='text'
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder='Tìm trong danh mục này'
                className='h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary'
              />
            </div>
          </div>

          {/* Mobile sub-category chips */}
          {subCategories.length > 0 && (
            <div className='lg:hidden flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide'>
              <button
                onClick={() => handleSelectSubCategory('all')}
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
                  onClick={() => handleSelectSubCategory(sub.id)}
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

          <div className='mb-5 rounded-2xl border border-border/60 bg-card p-4 lg:hidden'>
            <div className='mb-3 flex items-center gap-2'>
              <SlidersHorizontal size={15} className='text-muted-foreground' />
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

          <div className='flex items-center justify-between mb-6'>
            <p className='text-sm text-muted-foreground'>
              {pagination?.total ?? sorted.length} products
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
              sorted.map((p) => <ProductCard key={p.id} product={p} />)
            ) : (
              <div className='col-span-full text-center py-12 text-muted-foreground'>
                No products available in this category
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className='mt-8 flex items-center justify-center gap-2'>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={pagination.page <= 1}
                className='inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <span className='px-3 text-sm text-muted-foreground'>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                }
                disabled={pagination.page >= pagination.totalPages}
                className='inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
