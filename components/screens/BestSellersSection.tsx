'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBestSellers } from '@/hooks/use-products';
import { getProductImage } from '@/lib/utils';
import { useCart } from '@/lib/cart-store';
import type { Product } from '@/types/api.types';
import { trackMerchImpression } from '@/lib/merch-impressions';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

function BestSellerCard({
  product,
  surface,
}: {
  product: Product & { totalSold?: number };
  surface: 'product-detail' | 'home';
}) {
  const { addToCart } = useCart();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: getProductImage(product),
      type: 'cake',
      quantity: 1,
    });
  };

  useEffect(() => {
    if (!cardRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        void trackMerchImpression({
          productId: product.id,
          slot: 'best-seller',
          surface,
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [product.id, surface]);

  return (
    <div
      ref={cardRef}
      className='flex-shrink-0 w-56 md:w-64 rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow group'
    >
      {/* Product image */}
      <Link href={`/products/${product.id}`} className='block'>
        <div className='relative h-48 md:h-56 bg-secondary overflow-hidden'>
          <Image
            src={getProductImage(product)}
            alt={product.name}
            fill
            loading='lazy'
            sizes='256px'
            placeholder='blur'
            blurDataURL={PLACEHOLDER_BLUR}
            className='object-cover transition-transform group-hover:scale-105'
          />
        </div>
      </Link>

      {/* Info block — light green tint matching project palette */}
      <div className='bg-secondary px-4 py-3 flex flex-col gap-2'>
        <Link href={`/products/${product.id}`} className='block'>
          <p className='font-sans text-sm font-bold text-primary leading-snug line-clamp-2 group-hover:opacity-80 transition-opacity'>
            {product.name}
          </p>
          {product.sku && (
            <p className='text-xs text-muted-foreground mt-0.5'>
              {product.sku}
            </p>
          )}
        </Link>

        <div className='flex items-center justify-between gap-2 mt-1'>
          <p className='font-sans text-sm font-bold text-primary'>
            {product.price.toLocaleString('vi-VN')} VND
          </p>
          <button
            onClick={handleAddToCart}
            className='shrink-0 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5 rounded hover:opacity-90 active:scale-95 transition-all'
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

function BestSellerSkeleton() {
  return (
    <div className='flex-shrink-0 w-56 md:w-64 rounded-2xl overflow-hidden border border-border/40 bg-card animate-pulse'>
      <div className='h-48 md:h-56 bg-muted' />
      <div className='bg-secondary px-4 py-3 space-y-2'>
        <div className='h-4 bg-muted rounded w-4/5' />
        <div className='h-3 bg-muted rounded w-2/5' />
        <div className='flex justify-between items-center mt-1'>
          <div className='h-4 bg-muted rounded w-1/3' />
          <div className='h-7 bg-muted rounded w-20' />
        </div>
      </div>
    </div>
  );
}

export default function BestSellersSection({
  surface = 'home',
}: {
  surface?: 'product-detail' | 'home';
}) {
  const { data: products, isLoading } = useBestSellers(12);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const isEmpty = !isLoading && (!products || products.length === 0);
  if (isEmpty) return null;

  return (
    <section
      className='py-14 px-4 lg:px-8'
      aria-labelledby='best-sellers-heading'
    >
      {/* Heading */}
      <h2
        id='best-sellers-heading'
        className='font-serif text-3xl md:text-4xl font-bold text-primary text-center tracking-wide mb-10 text-balance'
      >
        SẢN PHẨM NỔI BẬT
      </h2>

      {/* Scrollable row + nav buttons */}
      <div className='relative'>
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          aria-label='Cuộn trái'
          className='hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border shadow items-center justify-center hover:bg-secondary transition-colors'
        >
          <ChevronLeft className='w-5 h-5 text-primary' />
        </button>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className='flex gap-4 overflow-x-auto scrollbar-hide pb-2'
          style={{ scrollSnapType: 'x mandatory' }}
          role='list'
          aria-label='Danh sách sản phẩm nổi bật'
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <BestSellerSkeleton key={i} />
              ))
            : products?.map((product) => (
                <div
                  key={product.id}
                  style={{ scrollSnapAlign: 'start' }}
                  role='listitem'
                >
                  <BestSellerCard product={product} surface={surface} />
                </div>
              ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          aria-label='Cuộn phải'
          className='hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card border border-border shadow items-center justify-center hover:bg-secondary transition-colors'
        >
          <ChevronRight className='w-5 h-5 text-primary' />
        </button>
      </div>
    </section>
  );
}
