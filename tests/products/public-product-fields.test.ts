import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLIC_PRODUCT_CARD_ARGS,
  PUBLIC_PRODUCT_OMIT,
  WISHLIST_PRODUCT_INCLUDE,
} from '@/lib/products/public-product-query';
import { publicProductDetailQuery } from '@/app/api/public/products/[id]/route';
import { publicProductsFindManyArgs } from '@/app/api/public/products/route';

// Cost price and barcode are back-office data: storefront and customer
// endpoints must never serialize them.
const INTERNAL_FIELDS = ['costPrice', 'barcode'];

test('public product omit hides every internal field', () => {
  assert.deepEqual(Object.keys(PUBLIC_PRODUCT_OMIT).sort(), [...INTERNAL_FIELDS].sort());
});

test('product detail query omits internal fields and only finds active products', () => {
  const args = publicProductDetailQuery('banh-mi');

  assert.equal(args.omit, PUBLIC_PRODUCT_OMIT);
  assert.equal(args.where.isActive, true);
  assert.deepEqual(args.where.OR, [{ id: 'banh-mi' }, { slug: 'banh-mi' }]);
});

test('product list query omits internal fields', () => {
  const args = publicProductsFindManyArgs({
    where: { isActive: true },
    skip: 0,
    take: 20,
    orderBy: [],
  });

  assert.equal(args.omit, PUBLIC_PRODUCT_OMIT);
});

test('best-seller and personalized product cards omit internal fields', () => {
  assert.equal(PUBLIC_PRODUCT_CARD_ARGS.omit, PUBLIC_PRODUCT_OMIT);
});

test('wishlist products omit internal fields', () => {
  assert.equal(WISHLIST_PRODUCT_INCLUDE.product.omit, PUBLIC_PRODUCT_OMIT);
});
