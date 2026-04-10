import assert from 'node:assert/strict';
import test from 'node:test';

import { handleGetPublicBannersRequest } from '@/app/api/public/banners/route';

test('public banners route returns success envelope and data list', async () => {
  const result = await handleGetPublicBannersRequest({
    findActiveBanners: async () => [
      { id: 'bn-1', title: 'Hero', isActive: true, displayOrder: 0 },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(Array.isArray(result.body.data), true);
  assert.equal((result.body.data as Array<{ id: string }>)[0].id, 'bn-1');
});

