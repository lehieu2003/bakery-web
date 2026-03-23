'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { getProductImages } from '@/lib/utils';
import { useCart } from '@/lib/cart-store';
import { useToggleWishlist } from '@/hooks/use-wishlist';
import { useAuth } from '@/providers/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import type { Product } from '@/types/api.types';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

const SLIDESHOW_INTERVAL_MS = 850;

function getPrimaryIndex(product: Product, imageUrls: string[]) {
  if (!product.images || product.images.length === 0) return 0;

  const primary = product.images.find(
    (image) => typeof image !== 'string' && image.isPrimary,
  );
  if (!primary || typeof primary === 'string') return 0;

  const idx = imageUrls.findIndex((url) => url === primary.url);
  return idx >= 0 ? idx : 0;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isFavorite, toggleFavorite, isToggling } = useToggleWishlist(
    product.id,
  );

  const imageUrls = useMemo(() => getProductImages(product), [product]);
  const safeImageUrls = useMemo(
    () => (imageUrls.length > 0 ? imageUrls : ['/images/placeholder.jpg']),
    [imageUrls],
  );
  const primaryIndex = useMemo(
    () => getPrimaryIndex(product, safeImageUrls),
    [product, safeImageUrls],
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(primaryIndex);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setCurrentImageIndex(primaryIndex);
  }, [primaryIndex]);

  useEffect(() => {
    if (!isHovering || safeImageUrls.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % safeImageUrls.length);
    }, SLIDESHOW_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovering, safeImageUrls.length]);

  const handleMouseEnter = () => {
    if (safeImageUrls.length <= 1) return;
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentImageIndex(primaryIndex);
  };

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    addToCart({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: safeImageUrls[primaryIndex] || safeImageUrls[0],
      type: 'cake',
      quantity: 1,
    });
  };

  const handleToggleFavorite = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      const redirectPath = pathname || `/products/${product.id}`;
      router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    await toggleFavorite();
  };

  return (
    <article
      className='group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className='relative w-full overflow-hidden bg-secondary pb-[100%]'>
        <Link href={`/products/${product.id}`} className='absolute inset-0 z-10'>
          <Image
            src={safeImageUrls[currentImageIndex]}
            alt={product.name}
            fill
            loading='lazy'
            sizes='(max-width: 768px) 50vw, 33vw'
            placeholder='blur'
            blurDataURL={PLACEHOLDER_BLUR}
            className='object-cover transition-transform duration-500 group-hover:scale-105'
          />
        </Link>

        <div className='pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/55 via-black/25 to-transparent px-4 pb-4 pt-8 opacity-0 transition-all duration-300 group-hover:opacity-100'>
          <button
            type='button'
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className='pointer-events-auto mx-auto block w-full max-w-[180px] translate-y-4 rounded-full bg-white/95 px-4 py-2 text-center text-xs font-semibold text-foreground shadow-sm transition-all duration-300 group-hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {product.stock <= 0 ? 'Hết hàng' : 'Add to Cart'}
          </button>
        </div>

        <button
          type='button'
          onClick={handleToggleFavorite}
          disabled={isToggling}
          aria-label={
            isFavorite ? 'Remove from favorite list' : 'Add to favorite list'
          }
          className='absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60'
        >
          <Heart
            size={16}
            className={isFavorite ? 'fill-red-500 text-red-500' : 'text-foreground'}
          />
        </button>
      </div>

      <Link href={`/products/${product.id}`} className='block p-4'>
        <p className='font-sans text-sm font-semibold leading-snug text-foreground text-balance'>
          {product.name}
        </p>
        {product.description && (
          <p className='mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground'>
            {product.description}
          </p>
        )}
        <p className='mt-2.5 font-sans text-base font-bold text-accent'>
          {product.price.toLocaleString('vi-VN')}đ
        </p>
      </Link>
    </article>
  );
}
