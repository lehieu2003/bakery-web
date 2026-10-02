'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRelatedProducts } from '@/hooks/use-products';
import { formatPrice, getProductImage } from '@/lib/utils';
import { useCart } from '@/lib/cart-store';
import type { Product } from '@/types/api.types';
import { trackMerchImpression } from '@/lib/merch-impressions';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

function RelatedProductCard({
  product,
  contextProductId,
}: {
  product: Product;
  contextProductId: string;
}) {
  const { addToCart } = useCart();
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round((1 - product.price / product.comparePrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      id: product.id,
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
          slot: 'related',
          surface: 'product-detail',
          contextProductId,
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [contextProductId, product.id]);

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.id}`}
      className='group flex flex-col rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow'
    >
      {/* Image */}
      <div className='relative aspect-square bg-secondary overflow-hidden'>
        <Image
          src={getProductImage(product)}
          alt={product.name}
          fill
          sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
          loading='lazy'
          placeholder='blur'
          blurDataURL={PLACEHOLDER_BLUR}
          className='object-cover transition-transform group-hover:scale-105'
        />
        {discount && (
          <span className='absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full'>
            -{discount}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className='flex flex-col flex-1 px-4 py-3 gap-2 bg-secondary'>
        <p className='font-sans text-sm font-bold text-primary line-clamp-2 leading-snug group-hover:opacity-80 transition-opacity'>
          {product.name}
        </p>
        {product.shortDescription && (
          <p className='text-xs text-muted-foreground line-clamp-1'>
            {product.shortDescription}
          </p>
        )}
        <div className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mt-auto pt-1'>
          <div>
            <p className='text-sm font-bold text-primary'>
              {formatPrice(product.price)}
            </p>
            {product.comparePrice && product.comparePrice > product.price && (
              <p className='text-xs text-muted-foreground line-through leading-none'>
                {formatPrice(product.comparePrice)}
              </p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className='ml-auto shrink-0 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5 rounded hover:opacity-90 active:scale-95 transition-all disabled:opacity-40'
          >
            {product.stock <= 0 ? 'Hết hàng' : 'Thêm'}
          </button>
        </div>
      </div>
    </Link>
  );
}

function RelatedProductSkeleton() {
  return (
    <div className='rounded-2xl overflow-hidden border border-border/40 bg-card animate-pulse'>
      <div className='aspect-square bg-muted' />
      <div className='bg-secondary px-4 py-3 space-y-2'>
        <div className='h-4 bg-muted rounded w-4/5' />
        <div className='h-3 bg-muted rounded w-3/5' />
        <div className='flex justify-between items-center mt-1'>
          <div className='h-4 bg-muted rounded w-1/3' />
          <div className='h-7 bg-muted rounded w-16' />
        </div>
      </div>
    </div>
  );
}

interface RelatedProductsProps {
  productId: string;
}

export default function RelatedProducts({ productId }: RelatedProductsProps) {
  const { data: products, isLoading } = useRelatedProducts(productId);

  const isEmpty = !isLoading && (!products || products.length === 0);
  if (isEmpty) return null;

  return (
    <section
      className='max-w-7xl mx-auto px-6 lg:px-8 py-12 border-t border-border'
      aria-labelledby='related-heading'
    >
      <h2
        id='related-heading'
        className='font-serif text-2xl md:text-3xl font-bold text-primary mb-8 text-balance'
      >
        Sản Phẩm Liên Quan
      </h2>

      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <RelatedProductSkeleton key={i} />
            ))
          : products?.map((product: Product) => (
              <RelatedProductCard
                key={product.id}
                product={product}
                contextProductId={productId}
              />
            ))}
      </div>
    </section>
  );
}
