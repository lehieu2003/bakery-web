// Client-side mirror of the store settings seeded in prisma/seed.ts.
// The public storefront has no settings endpoint yet; keep these values in
// sync with the Setting table (store settings in the admin panel).
export const STORE_CONFIG = {
  deliveryFee: 30000,
  freeDeliveryThreshold: 500000,
} as const;
