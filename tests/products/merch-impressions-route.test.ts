import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePostMerchImpressionRequest } from '@/app/api/public/merch-impressions/route';

test('merch impression route rejects invalid payload', async () => {
  const result = await handlePostMerchImpressionRequest({
    slot: 'related',
    surface: 'product-detail',
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});

test('merch impression route accepts best-seller payload', async () => {
  const result = await handlePostMerchImpressionRequest({
    productId: 'p-1',
    slot: 'best-seller',
    surface: 'home',
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});

test('merch impression route logs only the known fields', async () => {
  const logged: unknown[] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => logged.push(args);
  try {
    const result = await handlePostMerchImpressionRequest({
      productId: 'p-1',
      slot: 'related',
      surface: 'product-detail',
      contextProductId: 'p-0',
      injected: 'x'.repeat(10_000),
    });
    assert.equal(result.status, 200);
  } finally {
    console.info = original;
  }

  assert.deepEqual(logged, [
    [
      'merch_impression',
      { productId: 'p-1', slot: 'related', surface: 'product-detail', contextProductId: 'p-0' },
    ],
  ]);
});

test('merch impression route rejects oversized ids', async () => {
  const result = await handlePostMerchImpressionRequest({
    productId: 'p'.repeat(65),
    slot: 'related',
    surface: 'home',
  });

  assert.equal(result.status, 400);
});

test('merch impression route accepts personalized payload', async () => {
  const result = await handlePostMerchImpressionRequest({
    productId: 'p-2',
    slot: 'personalized',
    surface: 'home',
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});
