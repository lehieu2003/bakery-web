import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetRelatedProductsRequest } from '@/app/api/public/products/[id]/related/route';

test('related route returns 404 when product is not found', async () => {
  const result = await handleGetRelatedProductsRequest('missing', {
    findCurrentProduct: async () => null,
    findRelatedProducts: async () => [],
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('related route returns success with empty data when product has no categories', async () => {
  const result = await handleGetRelatedProductsRequest('p1', {
    findCurrentProduct: async () => ({ id: 'p1', categories: [] }),
    findRelatedProducts: async () => {
      throw new Error('should not query related products when no categories');
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data, []);
});

test('related route serializes numeric fields and createdAt', async () => {
  const createdAt = new Date('2026-04-04T00:00:00.000Z');
  const result = await handleGetRelatedProductsRequest('p1', {
    findCurrentProduct: async () => ({
      id: 'p1',
      categories: [{ categoryId: 'c1' }],
    }),
    findRelatedProducts: async () => [
      {
        id: 'p2',
        name: 'Chocolate Cake',
        slug: 'chocolate-cake',
        price: '125000',
        comparePrice: '140000',
        shortDescription: 'Rich and moist',
        stock: 10,
        isFeatured: true,
        createdAt,
        images: [],
        categories: [],
      },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].price, 125000);
  assert.equal(result.body.data[0].comparePrice, 140000);
  assert.equal(result.body.data[0].createdAt, createdAt.toISOString());
});

