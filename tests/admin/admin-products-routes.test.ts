import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleAdminProductsGetRequest,
  normalizeVariantCreateData,
  validateVariantPayload,
} from '@/app/api/admin/products/route';
import {
  getForeignVariantIdsForProduct,
  handleAdminProductDetailRequest,
} from '@/app/api/admin/products/[id]/route';
import { handleAdminProductAuditGetRequest } from '@/app/api/admin/products/[id]/audit/route';

function makeRequest(url: string) {
  return { url } as never;
}

test('admin products list normalizes invalid pagination and clamps limit', async () => {
  let capturedSkip = -1;
  let capturedTake = -1;
  let adminCheckCalled = false;

  const result = await handleAdminProductsGetRequest(
    makeRequest('http://localhost/api/admin/products?page=abc&limit=999'),
    {
      requireAdmin: async () => {
        adminCheckCalled = true;
        return { id: 'admin-1', role: 'ADMIN' };
      },
      findProducts: async ({ skip, take }) => {
        capturedSkip = skip;
        capturedTake = take;
        return [];
      },
      countProducts: async () => 0,
      findChildCategoryIds: async () => [],
    },
  );

  assert.equal(adminCheckCalled, true);
  assert.equal(capturedSkip, 0);
  assert.equal(capturedTake, 50);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.pagination.page, 1);
  assert.equal(result.body.data.pagination.limit, 50);
});

test('admin product list handler routes child-category lookup through injected deps', async () => {
  let capturedParentId = '';

  await handleAdminProductsGetRequest(
    makeRequest('http://localhost/api/admin/products?categoryId=cat-root'),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findProducts: async () => [],
      countProducts: async () => 0,
      findChildCategoryIds: async (parentId) => {
        capturedParentId = parentId;
        return ['cat-child'];
      },
    },
  );

  assert.equal(capturedParentId, 'cat-root');
});

test('admin product detail returns 404 when product does not exist', async () => {
  const result = await handleAdminProductDetailRequest(
    makeRequest('http://localhost/api/admin/products/p-1'),
    Promise.resolve({ id: 'p-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findProductById: async () => null,
    },
  );

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Không tìm thấy sản phẩm');
});

test('admin product detail requires admin authorization', async () => {
  await assert.rejects(
    handleAdminProductDetailRequest(
      makeRequest('http://localhost/api/admin/products/p-1'),
      Promise.resolve({ id: 'p-1' }),
      {
        requireAdmin: async () => {
          throw new Error('Unauthorized');
        },
        findProductById: async () => ({ id: 'p-1' }),
      },
    ),
    /Unauthorized/,
  );
});

test('normalizeVariantCreateData keeps numeric-string prices after normalization', () => {
  const variants = normalizeVariantCreateData([
    { name: 'M', price: '120000', stock: 3 },
  ]);

  assert.equal(variants.length, 1);
  assert.equal(variants[0].price, 120000);
  assert.equal(variants[0].stock, 3);
});

test('normalizeVariantCreateData drops invalid variant payload items', () => {
  const variants = normalizeVariantCreateData([
    { name: ' ', price: '120000', stock: 3 },
    { name: 'M', price: 'not-a-number', stock: 3 },
  ]);

  assert.equal(variants.length, 0);
});

test('validateVariantPayload rejects non-string variant id', () => {
  const error = validateVariantPayload([
    { id: 123, name: 'M', price: 100, stock: 1 },
  ]);

  assert.match(String(error), /invalid id/);
});

test('getForeignVariantIdsForProduct detects cross-product variant ids', () => {
  const foreignIds = getForeignVariantIdsForProduct(
    ['pv-1', 'pv-2'],
    ['pv-2', 'pv-9'],
  );

  assert.deepEqual(foreignIds, ['pv-9']);
});

test('admin product audit handler enforces auth and normalizes pagination', async () => {
  let capturedProductRefId = '';
  let capturedSkip = -1;
  let capturedTake = -1;

  const result = await handleAdminProductAuditGetRequest(
    makeRequest('http://localhost/api/admin/products/p-1/audit?page=-9&limit=999'),
    Promise.resolve({ id: 'p-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findLogs: async ({ productRefId, skip, take }) => {
        capturedProductRefId = productRefId;
        capturedSkip = skip;
        capturedTake = take;
        return [];
      },
      countLogs: async () => 0,
    },
  );

  assert.equal(capturedProductRefId, 'p-1');
  assert.equal(capturedSkip, 0);
  assert.equal(capturedTake, 50);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});

test('admin product audit handler rejects unauthorized access', async () => {
  await assert.rejects(
    handleAdminProductAuditGetRequest(
      makeRequest('http://localhost/api/admin/products/p-1/audit'),
      Promise.resolve({ id: 'p-1' }),
      {
        requireAdmin: async () => {
          throw new Error('Unauthorized');
        },
        findLogs: async () => [],
        countLogs: async () => 0,
      },
    ),
    /Unauthorized/,
  );
});
