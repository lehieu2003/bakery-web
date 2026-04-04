import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetBestSellersRequest } from '@/app/api/public/products/best-sellers/route';

test('best-sellers route falls back to newest active products when no sales data', async () => {
  let fallbackLimit = -1;

  const result = await handleGetBestSellersRequest(
    'http://localhost/api/public/products/best-sellers?limit=12',
    {
      groupTopSold: async () => [],
      findFallbackProducts: async (limit: number) => {
        fallbackLimit = limit;
        return [{ id: 'p1', name: 'Cake 1' }];
      },
      findRankedProducts: async () => [],
    },
  );

  assert.equal(fallbackLimit, 12);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.products[0].id, 'p1');
  assert.equal(result.body.data.products[0].totalSold, 0);
});

test('best-sellers route clamps invalid limit to default', async () => {
  let capturedLimit = -1;

  const result = await handleGetBestSellersRequest(
    'http://localhost/api/public/products/best-sellers?limit=invalid',
    {
      groupTopSold: async (limit: number) => {
        capturedLimit = limit;
        return [];
      },
      findFallbackProducts: async () => [],
      findRankedProducts: async () => [],
    },
  );

  assert.equal(capturedLimit, 10);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});

test('best-sellers route sorts products by sold quantity descending', async () => {
  const result = await handleGetBestSellersRequest(
    'http://localhost/api/public/products/best-sellers?limit=2',
    {
      groupTopSold: async () => [
        { productId: 'p2', _sum: { quantity: 30 } },
        { productId: 'p1', _sum: { quantity: 10 } },
      ],
      findFallbackProducts: async () => [],
      findRankedProducts: async () => [
        { id: 'p1', name: 'Cake 1' },
        { id: 'p2', name: 'Cake 2' },
      ],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(
    result.body.data.products.map((p: { id: string }) => p.id),
    ['p2', 'p1'],
  );
  assert.deepEqual(
    result.body.data.products.map((p: { totalSold: number }) => p.totalSold),
    [30, 10],
  );
});

