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

test('merch impression route accepts personalized payload', async () => {
  const result = await handlePostMerchImpressionRequest({
    productId: 'p-2',
    slot: 'personalized',
    surface: 'home',
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});
