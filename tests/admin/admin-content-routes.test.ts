import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminBannersPostRequest } from '@/app/api/admin/banners/route';
import { handleAdminBannerReorderRequest } from '@/app/api/admin/banners/reorder/route';

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('admin banners create rejects non-boolean isActive', async () => {
  const result = await handleAdminBannersPostRequest(
    makeRequest({
      title: 'Spring Promo',
      isActive: 'true',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBanners: async () => [],
      createBanner: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'isActive must be a boolean');
});

test('admin banners create rejects non-numeric displayOrder', async () => {
  const result = await handleAdminBannersPostRequest(
    makeRequest({
      title: 'Spring Promo',
      displayOrder: '1',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBanners: async () => [],
      createBanner: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Thứ tự hiển thị phải là số nguyên không âm');
});

test('admin banners reorder rejects duplicate IDs', async () => {
  const result = await handleAdminBannerReorderRequest(
    makeRequest({
      items: [
        { id: 'bn-1', displayOrder: 0 },
        { id: 'bn-1', displayOrder: 1 },
      ],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBannersByIds: async () => [{ id: 'bn-1' }],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /duplicate banner IDs/);
});

test('admin banners reorder rejects non-numeric displayOrder entries', async () => {
  const result = await handleAdminBannerReorderRequest(
    makeRequest({
      items: [{ id: 'bn-1', displayOrder: '1' }],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBannersByIds: async () => [{ id: 'bn-1' }],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /thứ tự hiển thị/i);
});
