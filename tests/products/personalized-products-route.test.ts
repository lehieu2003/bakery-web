import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetPersonalizedProductsRequest } from '@/app/api/public/products/personalized/route';

test('personalized route returns behavioral ranking with deterministic ordering', async () => {
  let fallbackCalls = 0;

  const result = await handleGetPersonalizedProductsRequest(
    'http://localhost/api/public/products/personalized?limit=2',
    { userId: 'u-1' },
    {
      getBehaviorSignals: async () => [
        {
          productId: 'p1',
          orderQty: 5,
          lastOrderedAt: new Date('2026-04-06T09:00:00.000Z'),
          lastWishlistedAt: null,
        },
        {
          productId: 'p2',
          orderQty: 2,
          lastOrderedAt: new Date('2026-04-06T10:00:00.000Z'),
          lastWishlistedAt: new Date('2026-04-06T11:00:00.000Z'),
        },
      ],
      findBehavioralProducts: async () => [{ id: 'p2' }, { id: 'p1' }],
      getFallbackProducts: async () => {
        fallbackCalls += 1;
        return [{ id: 'f1' }];
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.source, 'behavioral');
  assert.equal(result.body.data.reason, 'behavior-match');
  assert.deepEqual(
    result.body.data.products.map((product: { id: string }) => product.id),
    ['p1', 'p2'],
  );
  assert.equal(fallbackCalls, 0);
});

test('personalized route returns hybrid results when behavior candidates are insufficient', async () => {
  const result = await handleGetPersonalizedProductsRequest(
    'http://localhost/api/public/products/personalized?limit=3',
    { userId: 'u-1' },
    {
      getBehaviorSignals: async () => [
        {
          productId: 'p1',
          orderQty: 2,
          lastOrderedAt: new Date('2026-04-06T09:00:00.000Z'),
          lastWishlistedAt: null,
        },
      ],
      findBehavioralProducts: async () => [{ id: 'p1' }],
      getFallbackProducts: async () => [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.source, 'hybrid');
  assert.equal(result.body.data.reason, 'insufficient-signal');
  assert.deepEqual(
    result.body.data.products.map((product: { id: string }) => product.id),
    ['p1', 'p2', 'p3'],
  );
});

test('personalized route returns fallback recommendations for no behavior signal', async () => {
  const result = await handleGetPersonalizedProductsRequest(
    'http://localhost/api/public/products/personalized?limit=2',
    { userId: 'u-1' },
    {
      getBehaviorSignals: async () => [],
      findBehavioralProducts: async () => {
        throw new Error('should not fetch behavioral products without signal');
      },
      getFallbackProducts: async () => [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.source, 'fallback');
  assert.equal(result.body.data.reason, 'no-signal');
  assert.deepEqual(
    result.body.data.products.map((product: { id: string }) => product.id),
    ['f1', 'f2'],
  );
});

test('personalized route returns fallback recommendations for anonymous visitors', async () => {
  let behaviorCalls = 0;

  const result = await handleGetPersonalizedProductsRequest(
    'http://localhost/api/public/products/personalized?limit=2',
    { userId: null },
    {
      getBehaviorSignals: async () => {
        behaviorCalls += 1;
        return [];
      },
      findBehavioralProducts: async () => [],
      getFallbackProducts: async () => [{ id: 'f1' }, { id: 'f2' }],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.source, 'fallback');
  assert.equal(result.body.data.reason, 'no-user');
  assert.equal(behaviorCalls, 0);
});
