import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetPublicProductRequest,
  type PublicProductDetailDeps,
} from '@/app/api/public/products/[id]/route';

function createDeps(overrides: Partial<PublicProductDetailDeps> = {}): PublicProductDetailDeps {
  return {
    findProductDetail: async () => ({
      id: 'p1', name: 'Banh mi', price: 25000,
      reviews: [{ rating: 5, comment: 'ngon', createdAt: new Date(), user: { id: 'u1', name: 'Lan' } }],
    }),
    getReviewStats: async () => ({ total: 128, average: 4.25 }),
    ...overrides,
  };
}

test('GET product detail returns reviewCount and rounded ratingAverage', async () => {
  const result = await handleGetPublicProductRequest(
    'http://localhost/api/public/products/p1', { id: 'p1' }, createDeps(),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.data.product.reviewCount, 128);
  assert.equal(result.body.data.product.ratingAverage, 4.3); // Math.round(4.25 * 10) / 10
  assert.equal(result.body.data.product.reviews.length, 1);
});

test('GET product detail 404s when product is missing', async () => {
  const result = await handleGetPublicProductRequest(
    'http://localhost/api/public/products/nope', { id: 'nope' },
    createDeps({ findProductDetail: async () => null }),
  );
  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('ratingAverage is null when the product has no reviews', async () => {
  const result = await handleGetPublicProductRequest(
    'http://localhost/api/public/products/p1', { id: 'p1' },
    createDeps({ getReviewStats: async () => ({ total: 0, average: null }) }),
  );
  assert.equal(result.body.data.product.reviewCount, 0);
  assert.equal(result.body.data.product.ratingAverage, null);
});
