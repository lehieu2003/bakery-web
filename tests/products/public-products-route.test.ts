import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetPublicProductsRequest } from '@/app/api/public/products/route';

test('public products route normalizes invalid pagination values', async () => {
  let captured: { skip: number; take: number } | null = null;

  const result = await handleGetPublicProductsRequest(
    'http://localhost/api/public/products?page=-5&limit=999',
    {
      parseAttributeFilters: () => [],
      buildProductAttributeWhere: () => [],
      listActiveCategories: async () => [],
      findProducts: async ({ skip, take }) => {
        captured = { skip, take };
        return [];
      },
      countProducts: async () => 0,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.pagination.page, 1);
  assert.equal(result.body.data.pagination.limit, 60);
  assert.equal(result.body.data.pagination.totalPages, 0);
  assert.deepEqual(captured, { skip: 0, take: 60 });
});

test('public products route includes descendant category ids and keeps pagination envelope', async () => {
  let capturedWhere: Record<string, unknown> | null = null;
  let capturedSkip = -1;
  let capturedTake = -1;

  const result = await handleGetPublicProductsRequest(
    'http://localhost/api/public/products?categoryId=c1&page=2&limit=5',
    {
      parseAttributeFilters: () => [],
      buildProductAttributeWhere: () => [],
      listActiveCategories: async () => [
        { id: 'c2', parentId: 'c1' },
        { id: 'c3', parentId: 'c2' },
      ],
      findProducts: async ({ where, skip, take }) => {
        capturedWhere = where;
        capturedSkip = skip;
        capturedTake = take;
        return [{ id: 'p1' }, { id: 'p2' }] as unknown[];
      },
      countProducts: async () => 13,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.pagination.page, 2);
  assert.equal(result.body.data.pagination.limit, 5);
  assert.equal(result.body.data.pagination.total, 13);
  assert.equal(result.body.data.pagination.totalPages, 3);
  assert.equal(capturedSkip, 5);
  assert.equal(capturedTake, 5);

  const where = (capturedWhere ?? {}) as Record<string, unknown>;
  const categoryFilter = (where['categories'] as {
    some: { categoryId: { in: string[] } };
  }).some.categoryId.in;
  assert.deepEqual(categoryFilter, ['c1', 'c2', 'c3']);
});

test('public products route composes keyword, price, stock and attribute filters', async () => {
  let capturedWhere: Record<string, unknown> | null = null;

  const result = await handleGetPublicProductsRequest(
    'http://localhost/api/public/products?categoryId=c1&search=tart&minPrice=10&maxPrice=50&inStock=true&attribute=flavor:chocolate,vanilla',
    {
      parseAttributeFilters: () => [
        { attributeSlug: 'flavor', valueSlugs: ['chocolate', 'vanilla'] },
      ],
      buildProductAttributeWhere: () => [{ attributeAssignments: { some: { valueKey: 'flavor:chocolate' } } }],
      listActiveCategories: async () => [],
      findProducts: async ({ where }) => {
        capturedWhere = where;
        return [];
      },
      countProducts: async () => 0,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);

  const where = (capturedWhere ?? {}) as Record<string, unknown>;
  assert.deepEqual(where['price'], { gte: 10, lte: 50 });
  const andConditions = (where['AND'] as Record<string, unknown>[]) ?? [];
  assert.ok(andConditions.length >= 3);
  assert.deepEqual(andConditions[2], {
    attributeAssignments: { some: { valueKey: 'flavor:chocolate' } },
  });
});


test('public products route maps sort param to prisma orderBy', async () => {
  let capturedOrderBy: Record<string, unknown>[] | null = null;

  const result = await handleGetPublicProductsRequest(
    'http://localhost/api/public/products?sort=price-asc',
    {
      parseAttributeFilters: () => [],
      buildProductAttributeWhere: () => [],
      listActiveCategories: async () => [],
      findProducts: async ({ orderBy }) => {
        capturedOrderBy = orderBy;
        return [];
      },
      countProducts: async () => 0,
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(capturedOrderBy, [{ price: 'asc' }]);
});

test('public products route defaults to popular ordering and rejects unknown sort', async () => {
  const captured: (Record<string, unknown>[] | null)[] = [];

  for (const query of ['', 'sort=popular', 'sort=totally-unknown']) {
    let orderBy: Record<string, unknown>[] | null = null;
    await handleGetPublicProductsRequest(
      `http://localhost/api/public/products${query ? `?${query}` : ''}`,
      {
        parseAttributeFilters: () => [],
        buildProductAttributeWhere: () => [],
        listActiveCategories: async () => [],
        findProducts: async (args) => {
          orderBy = args.orderBy;
          return [];
        },
        countProducts: async () => 0,
      },
    );
    captured.push(orderBy);
  }

  assert.ok(captured.every((entry) => entry !== null));
  assert.deepEqual(captured[0], [{ isFeatured: 'desc' }, { createdAt: 'desc' }]);
  assert.deepEqual(captured[1], [{ isFeatured: 'desc' }, { createdAt: 'desc' }]);
  assert.deepEqual(captured[2], [{ isFeatured: 'desc' }, { createdAt: 'desc' }]);
});
