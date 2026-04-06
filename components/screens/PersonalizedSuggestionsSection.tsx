'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { usePersonalizedRecommendations } from '@/hooks/use-personalized-recommendations';
import { useCart } from '@/lib/cart-store';
import { trackMerchImpression } from '@/lib/merch-impressions';
import { getProductImage } from '@/lib/utils';
import type {
  PersonalizedRecommendationReason,
  PersonalizedRecommendationSource,
} from '@/services/personalized-recommendation.service';
import type { Product } from '@/types/api.types';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

function buildFallbackMessage(args: {
  source?: PersonalizedRecommendationSource;
  reason?: PersonalizedRecommendationReason;
  isError: boolean;
}) {
  if (args.isError) {
    return 'Unable to load personalized suggestions right now.';
  }

  if (!args.source || args.source === 'behavioral') return null;

  switch (args.reason) {
    case 'no-user':
      return 'Sign in to unlock personalized suggestions. Showing featured picks for now.';
    case 'no-signal':
      return 'We are still learning your taste. Showing featured picks for now.';
    case 'insufficient-signal':
      return 'Showing a mix of personalized picks and featured products.';
    default:
      return null;
  }
}

function PersonalizedSuggestionCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  const productImage = useMemo(() => getProductImage(product), [product]);

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: productImage,
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
          slot: 'personalized',
          surface: 'home',
        });

        observer.disconnect();
      },
      { threshold: 0.5 },
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [product.id]);

  return (
    <Link
      ref={cardRef}
      href={`/products/${product.id}`}
      className='group flex flex-col rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow'
    >
      <div className='relative aspect-square bg-secondary overflow-hidden'>
        <Image
          src={productImage}
          alt={product.name}
          fill
          sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
          loading='lazy'
          placeholder='blur'
          blurDataURL={PLACEHOLDER_BLUR}
          className='object-cover transition-transform group-hover:scale-105'
        />
      </div>

      <div className='flex flex-col flex-1 px-4 py-3 gap-2 bg-secondary'>
        <p className='font-sans text-sm font-bold text-primary line-clamp-2 leading-snug group-hover:opacity-80 transition-opacity'>
          {product.name}
        </p>

        {product.shortDescription && (
          <p className='text-xs text-muted-foreground line-clamp-1'>
            {product.shortDescription}
          </p>
        )}

        <div className='flex items-center justify-between gap-2 mt-auto pt-1'>
          <p className='text-sm font-bold text-primary'>
            {product.price.toLocaleString('vi-VN')}đ
          </p>

          <button
            type='button'
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className='shrink-0 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5 rounded hover:opacity-90 active:scale-95 transition-all disabled:opacity-40'
          >
            {product.stock <= 0 ? 'Hết hàng' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  );
}

function PersonalizedSuggestionSkeleton() {
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

export default function PersonalizedSuggestionsSection() {
  const { data, isLoading, isError } = usePersonalizedRecommendations({
    limit: 12,
  });

  const products = data?.products ?? [];
  const fallbackMessage = buildFallbackMessage({
    source: data?.source,
    reason: data?.reason,
    isError,
  });

  if (!isLoading && products.length === 0 && !fallbackMessage) {
    return null;
  }

  return (
    <section
      className='max-w-7xl mx-auto px-6 lg:px-8 py-12'
      aria-labelledby='personalized-heading'
    >
      <div className='mb-8'>
        <h2
          id='personalized-heading'
          className='font-serif text-2xl md:text-3xl font-bold text-primary text-balance'
        >
          Gợi Ý Dành Cho Bạn
        </h2>

        {fallbackMessage && (
          <p className='mt-3 text-sm text-muted-foreground' aria-live='polite'>
            {fallbackMessage}
          </p>
        )}
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <PersonalizedSuggestionSkeleton key={index} />
            ))
          : products.map((product) => (
              <PersonalizedSuggestionCard key={product.id} product={product} />
            ))}
      </div>
    </section>
  );
}
