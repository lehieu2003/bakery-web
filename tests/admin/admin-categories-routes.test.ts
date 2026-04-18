import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleAdminCategoriesGetRequest,
  handleAdminCategoriesPostRequest,
} from '@/app/api/admin/categories/route';
import {
  handleAdminCategoryDeleteRequest,
  handleAdminCategoryUpdateRequest,
} from '@/app/api/admin/categories/[id]/route';
import { handleAdminCategoryReorderRequest } from '@/app/api/admin/categories/reorder/route';

function makeRequest(body: unknown) {
  return {
    json: async () => body,
    method: 'POST',
    headers: new Headers(),
    url: 'http://localhost/api/admin/categories',
  } as never;
}

test('admin categories list handler requires admin authorization', async () => {
  await assert.rejects(
    handleAdminCategoriesGetRequest({
      requireAdmin: async () => {
        throw new Error('Unauthorized');
      },
      findAllCategories: async () => [],
      findCategoryBySlug: async () => null,
      findCategoryById: async () => null,
      createCategory: async () => ({}),
    }),
    /Unauthorized/,
  );
});

test('admin categories create validates displayOrder', async () => {
  const result = await handleAdminCategoriesPostRequest(
    makeRequest({
      name: 'Bread',
      slug: 'bread',
      displayOrder: -1,
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAllCategories: async () => [],
      findCategoryBySlug: async () => null,
      findCategoryById: async () => null,
      createCategory: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /displayOrder/);
});

test('admin categories create rejects non-boolean visibility flags', async () => {
  const result = await handleAdminCategoriesPostRequest(
    makeRequest({
      name: 'Bread',
      slug: 'bread',
      isActive: 'false',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAllCategories: async () => [],
      findCategoryBySlug: async () => null,
      findCategoryById: async () => null,
      createCategory: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'isActive must be a boolean');
});

test('admin categories create rejects unknown parent category', async () => {
  const result = await handleAdminCategoriesPostRequest(
    makeRequest({
      name: 'Bread',
      slug: 'bread',
      parentId: 'missing-parent',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAllCategories: async () => [],
      findCategoryBySlug: async () => null,
      findCategoryById: async () => null,
      createCategory: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Parent category not found');
});

test('admin categories create writes admin action audit with correlation metadata', async () => {
  const audits: Array<Record<string, unknown>> = [];
  const result = await handleAdminCategoriesPostRequest(
    ({
      json: async () => ({
        name: 'Bread',
        slug: 'bread',
      }),
      method: 'POST',
      headers: new Headers([['x-request-id', 'req-123']]),
      url: 'http://localhost/api/admin/categories',
    } as unknown) as never,
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAllCategories: async () => [],
      findCategoryBySlug: async () => null,
      findCategoryById: async () => null,
      createCategory: async () => ({ id: 'cat-1', name: 'Bread' }),
      writeAdminAudit: async (payload) => {
        audits.push(payload as unknown as Record<string, unknown>);
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(audits.length, 1);
  const correlation = audits[0].correlation as Record<string, unknown>;
  assert.equal(correlation.requestId, 'req-123');
  assert.equal(correlation.httpMethod, 'POST');
  assert.equal(correlation.route, '/api/admin/categories');
});

test('admin category update blocks descendant-parent cycle', async () => {
  const result = await handleAdminCategoryUpdateRequest(
    makeRequest({
      parentId: 'cat-child',
    }),
    Promise.resolve({ id: 'cat-root' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoryById: async () => null,
      findCategoryNodeById: async (id) => {
        if (id === 'cat-root') return { id, parentId: null, level: 1 };
        if (id === 'cat-child') return { id, parentId: 'cat-root', level: 2 };
        return null;
      },
      findCategoryBySlug: async () => null,
      findChildrenByParentIds: async (parentIds) => {
        if (parentIds.includes('cat-root')) {
          return [{ id: 'cat-child', parentId: 'cat-root', level: 2 }];
        }
        return [];
      },
      updateCategory: async () => ({}),
      updateCategoryLevel: async () => undefined,
      countCategoryProducts: async () => 0,
      countCategoryChildren: async () => 0,
      deleteCategory: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /descendant category/);
});

test('admin category update rejects non-boolean visibility flags', async () => {
  const result = await handleAdminCategoryUpdateRequest(
    makeRequest({
      showInMenu: 'false',
    }),
    Promise.resolve({ id: 'cat-root' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoryById: async () => null,
      findCategoryNodeById: async () => ({ id: 'cat-root', parentId: null, level: 1 }),
      findCategoryBySlug: async () => null,
      findChildrenByParentIds: async () => [],
      updateCategory: async () => ({}),
      updateCategoryLevel: async () => undefined,
      countCategoryProducts: async () => 0,
      countCategoryChildren: async () => 0,
      deleteCategory: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'showInMenu must be a boolean');
});

test('admin category delete blocks when category has products', async () => {
  const result = await handleAdminCategoryDeleteRequest(
    { method: 'DELETE', headers: new Headers() } as never,
    Promise.resolve({ id: 'cat-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoryById: async () => null,
      findCategoryNodeById: async () => ({ id: 'cat-1', parentId: null, level: 1 }),
      findCategoryBySlug: async () => null,
      findChildrenByParentIds: async () => [],
      updateCategory: async () => ({}),
      updateCategoryLevel: async () => undefined,
      countCategoryProducts: async () => 3,
      countCategoryChildren: async () => 0,
      deleteCategory: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /3 products/);
});

test('admin category delete blocks when category has child categories', async () => {
  const result = await handleAdminCategoryDeleteRequest(
    { method: 'DELETE', headers: new Headers() } as never,
    Promise.resolve({ id: 'cat-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoryById: async () => null,
      findCategoryNodeById: async () => ({ id: 'cat-1', parentId: null, level: 1 }),
      findCategoryBySlug: async () => null,
      findChildrenByParentIds: async () => [],
      updateCategory: async () => ({}),
      updateCategoryLevel: async () => undefined,
      countCategoryProducts: async () => 0,
      countCategoryChildren: async () => 2,
      deleteCategory: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /2 child categories/);
});

test('admin category reorder rejects duplicate ids', async () => {
  const result = await handleAdminCategoryReorderRequest(
    makeRequest({
      items: [
        { id: 'cat-1', displayOrder: 1 },
        { id: 'cat-1', displayOrder: 2 },
      ],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoriesByIds: async () => [],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /duplicate/);
});

test('admin category reorder rejects duplicate displayOrder values', async () => {
  const result = await handleAdminCategoryReorderRequest(
    makeRequest({
      items: [
        { id: 'cat-1', displayOrder: 1 },
        { id: 'cat-2', displayOrder: 1 },
      ],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoriesByIds: async () => [],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /duplicate displayOrder/);
});

test('admin category reorder rejects non-root categories', async () => {
  const result = await handleAdminCategoryReorderRequest(
    makeRequest({
      items: [{ id: 'cat-1', displayOrder: 1 }],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoriesByIds: async () => [{ id: 'cat-1', parentId: 'cat-root' }],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /root categories/);
});
