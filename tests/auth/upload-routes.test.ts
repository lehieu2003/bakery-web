import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleUploadDeleteRouteRequest,
  UPLOAD_DELETE_POLICY,
} from '@/app/api/upload/delete/route';
import { handleUploadPostRequest } from '@/app/api/upload/route';
import { hasPolicyAccess } from '@/lib/authorization-policy';

function createRequest(body?: unknown) {
  return {
    json: async () => body ?? {},
  } as never;
}

test('upload route returns 401 for unauthenticated caller', async () => {
  const result = await handleUploadPostRequest(createRequest({ file: 'data:image/png;base64,abc' }), {
    requireUploader: async () => {
      throw new Error('Unauthorized');
    },
    uploadOne: async () => ({ success: true, url: 'https://cdn.test/a.png', publicId: 'a' }),
    uploadMany: async () => [],
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
  assert.equal('data' in result.body, false);
});

test('upload route validates payload boundary', async () => {
  const result = await handleUploadPostRequest(createRequest({}), {
    requireUploader: async () => ({ id: 'user-1', role: 'CUSTOMER' }),
    uploadOne: async () => ({ success: true, url: 'https://cdn.test/a.png', publicId: 'a' }),
    uploadMany: async () => [],
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Chưa chọn file nào');
});

test('upload delete route returns 401 for unauthenticated caller', async () => {
  const result = await handleUploadDeleteRouteRequest(createRequest({ publicId: 'x' }), {
    requireUploader: async () => {
      throw new Error('Unauthorized');
    },
    deleteImage: async () => ({ success: true }),
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
  assert.equal('data' in result.body, false);
});

test('upload delete is admin-only so customers cannot destroy storefront images', () => {
  assert.equal(UPLOAD_DELETE_POLICY, 'ADMIN_ONLY');
  assert.equal(hasPolicyAccess('CUSTOMER', UPLOAD_DELETE_POLICY), false);
  assert.equal(hasPolicyAccess('ADMIN', UPLOAD_DELETE_POLICY), true);
});

test('upload delete route returns 400 for missing publicId', async () => {
  const result = await handleUploadDeleteRouteRequest(createRequest({}), {
    requireUploader: async () => ({ id: 'admin-1', role: 'ADMIN' }),
    deleteImage: async () => ({ success: true }),
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Thiếu Public ID');
});

