import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleAdminProductAttributesPostRequest,
  normalizeAttributeValues,
} from '@/app/api/admin/product-attributes/route';
import { handleAdminProductAttributeUpdateRequest } from '@/app/api/admin/product-attributes/[id]/route';

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('normalizeAttributeValues rejects invalid label payload', () => {
  const result = normalizeAttributeValues([{ label: ' ' }]);

  assert.equal('error' in result, true);
  assert.match(String((result as { error: string }).error), /cần nhãn/);
});

test('normalizeAttributeValues rejects duplicate slug/value payload', () => {
  const duplicateSlug = normalizeAttributeValues([
    { label: 'Red', slug: 'red' },
    { label: 'Dark Red', slug: 'red' },
  ]);

  assert.equal('error' in duplicateSlug, true);
  assert.match(String((duplicateSlug as { error: string }).error), /Trùng slug giá trị/);

  const duplicateValue = normalizeAttributeValues([
    { label: 'Red', value: 'red' },
    { label: 'Another Red', value: 'red' },
  ]);

  assert.equal('error' in duplicateValue, true);
  assert.match(String((duplicateValue as { error: string }).error), /Trùng giá trị/);
});

test('admin product-attributes create validates attribute type', async () => {
  const result = await handleAdminProductAttributesPostRequest(
    makeRequest({
      name: 'Color',
      slug: 'color',
      code: 'COLOR',
      type: 'INVALID_TYPE',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAttributes: async () => [],
      findAttributeBySlug: async () => null,
      findAttributeByCode: async () => null,
      createAttribute: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Loại thuộc tính không hợp lệ');
});

test('admin product-attributes create rejects duplicate code', async () => {
  const result = await handleAdminProductAttributesPostRequest(
    makeRequest({
      name: 'Color',
      slug: 'color',
      code: 'COLOR',
      type: 'SELECT',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAttributes: async () => [],
      findAttributeBySlug: async () => null,
      findAttributeByCode: async () => ({ id: 'attr-1' }),
      createAttribute: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Thuộc tính đã tồn tại (mã)');
});

test('admin product-attributes create rejects non-boolean flags', async () => {
  const result = await handleAdminProductAttributesPostRequest(
    makeRequest({
      name: 'Color',
      slug: 'color',
      code: 'COLOR',
      type: 'SELECT',
      isRequired: 'true',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAttributes: async () => [],
      findAttributeBySlug: async () => null,
      findAttributeByCode: async () => null,
      createAttribute: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'isRequired must be a boolean');
});

test('admin product-attribute update prevents deleting values assigned to products', async () => {
  await assert.rejects(
    handleAdminProductAttributeUpdateRequest(
      makeRequest({
        values: [{ label: 'Only New Value', slug: 'only-new' }],
      }),
      Promise.resolve({ id: 'attr-1' }),
      {
        requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
        findAttributeById: async () => null,
        findAttributeForUpdate: async () => ({
          id: 'attr-1',
          slug: 'color',
          code: 'COLOR',
          values: [{ id: 'v-old', slug: 'red', value: 'red' }],
        }),
        findAttributeBySlug: async () => null,
        findAttributeByCode: async () => null,
        countAssignmentsByValueIds: async () => 1,
        deleteValuesByIds: async () => undefined,
        createValue: async () => undefined,
        updateValueById: async () => undefined,
        updateAttribute: async () => undefined,
        findAttributeDetailById: async () => ({ id: 'attr-1' }),
        deleteAttribute: async () => undefined,
        withTransaction: async (fn) => fn({} as never),
      },
    ),
    /Không thể xóa giá trị/,
  );
});

test('admin product-attribute update rejects non-boolean flags', async () => {
  const result = await handleAdminProductAttributeUpdateRequest(
    makeRequest({
      isActive: 'false',
    }),
    Promise.resolve({ id: 'attr-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAttributeById: async () => null,
      findAttributeForUpdate: async () => ({
        id: 'attr-1',
        slug: 'color',
        code: 'COLOR',
        values: [],
      }),
      findAttributeBySlug: async () => null,
      findAttributeByCode: async () => null,
      countAssignmentsByValueIds: async () => 0,
      deleteValuesByIds: async () => undefined,
      createValue: async () => undefined,
      updateValueById: async () => undefined,
      updateAttribute: async () => undefined,
      findAttributeDetailById: async () => ({ id: 'attr-1' }),
      deleteAttribute: async () => undefined,
      withTransaction: async (fn) => fn({} as never),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'isActive must be a boolean');
});
