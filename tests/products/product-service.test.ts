import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductQueryParams } from '@/services/product.service';

test('buildProductQueryParams returns empty string for undefined params', () => {
  assert.equal(buildProductQueryParams(), '');
});

test('buildProductQueryParams builds category pagination and attribute filters', () => {
  const query = buildProductQueryParams({
    categoryId: 'cat-1',
    page: 2,
    limit: 12,
    minPrice: 10000,
    maxPrice: 50000,
    inStock: true,
    attributeFilters: [
      { attributeSlug: 'size', valueSlugs: ['small', 'large'] },
      { attributeSlug: 'flavor', valueSlugs: ['vanilla'] },
    ],
  });

  assert.ok(query.startsWith('?'));
  const params = new URLSearchParams(query.slice(1));

  assert.equal(params.get('categoryId'), 'cat-1');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('limit'), '12');
  assert.equal(params.get('minPrice'), '10000');
  assert.equal(params.get('maxPrice'), '50000');
  assert.equal(params.get('inStock'), 'true');
  assert.deepEqual(params.getAll('attribute'), [
    'size:small,large',
    'flavor:vanilla',
  ]);
});
