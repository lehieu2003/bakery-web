import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ProductImage } from '@/types/api.types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the primary image URL from a product's images array.
 * Falls back to first image, then placeholder.
 */
export function getProductImage(
  product: {
    images?: (ProductImage | string)[] | null;
    imageUrl?: string | null;
  },
  placeholder = '/images/placeholder.jpg',
): string {
  // Legacy: if imageUrl still exists (backward compat)
  if (product.imageUrl) return product.imageUrl;

  if (!product.images || product.images.length === 0) return placeholder;

  const first = product.images[0];
  if (typeof first === 'string') return first || placeholder;

  const imgs = product.images as ProductImage[];
  const primary = imgs.find((img) => img.isPrimary);
  return primary?.url || imgs[0]?.url || placeholder;
}

/**
 * Get all image URLs from a product's images array.
 */
export function getProductImages(product: {
  images?: (ProductImage | string)[] | null;
  imageUrl?: string | null;
}): string[] {
  if (!product.images || product.images.length === 0) {
    return product.imageUrl ? [product.imageUrl] : [];
  }

  const first = product.images[0];
  if (typeof first === 'string') return product.images as string[];

  return (product.images as ProductImage[]).map((img) => img.url);
}
