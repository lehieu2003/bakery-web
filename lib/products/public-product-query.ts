import type { Prisma } from '@prisma/client';

/**
 * Back-office product fields that storefront and customer endpoints must
 * never serialize. Admin routes (`/api/admin/**`) read products without it.
 */
export const PUBLIC_PRODUCT_OMIT = {
  costPrice: true,
  barcode: true,
} as const satisfies Prisma.ProductOmit;

/** Product card shape shared by the best-seller and personalized lists. */
export const PUBLIC_PRODUCT_CARD_ARGS = {
  omit: PUBLIC_PRODUCT_OMIT,
  include: {
    categories: {
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    },
    images: { orderBy: { displayOrder: 'asc' } },
  },
} as const satisfies Prisma.ProductDefaultArgs;

/** Wishlist rows with their product, as returned to the signed-in customer. */
export const WISHLIST_PRODUCT_INCLUDE = {
  product: {
    omit: PUBLIC_PRODUCT_OMIT,
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      },
      categories: {
        include: {
          category: true,
        },
      },
      variants: true,
    },
  },
} as const satisfies Prisma.WishlistInclude;
