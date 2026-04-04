import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areFilterStateRecordsEqual,
  buildListingUrlSearchParams,
  parseListingUrlState,
} from '@/lib/search-filter-state';

test('parseListingUrlState parses query params into normalized listing state', () => {
  const params = new URLSearchParams(
    'q=tart&page=3&minPrice=10000&maxPrice=50000&inStock=true&subCategory=sub-1&attribute=flavor:vanilla,chocolate&attribute=size:small',
  );

  const state = parseListingUrlState(params);

  assert.equal(state.search, 'tart');
  assert.equal(state.page, 3);
  assert.equal(state.minPrice, '10000');
  assert.equal(state.maxPrice, '50000');
  assert.equal(state.inStockOnly, true);
  assert.equal(state.subCategoryId, 'sub-1');
  assert.deepEqual(state.selectedFilters, {
    flavor: ['vanilla', 'chocolate'],
    size: ['small'],
  });
});

test('buildListingUrlSearchParams serializes state and omits defaults', () => {
  const params = buildListingUrlSearchParams(
    {
      search: 'bread',
      page: 1,
      minPrice: '',
      maxPrice: '20000',
      inStockOnly: true,
      subCategoryId: 'all',
      selectedFilters: {
        size: ['large', 'small', 'small'],
      },
    },
    { includeSubCategory: true },
  );

  assert.equal(params.get('q'), 'bread');
  assert.equal(params.get('page'), null);
  assert.equal(params.get('maxPrice'), '20000');
  assert.equal(params.get('inStock'), 'true');
  assert.equal(params.get('subCategory'), null);
  assert.deepEqual(params.getAll('attribute'), ['size:large,small']);
});

test('parse and build preserve filter state round-trip', () => {
  const original = new URLSearchParams(
    'q=cake&minPrice=10&maxPrice=20&inStock=true&attribute=flavor:vanilla,chocolate&attribute=size:small&page=2&subCategory=sub-2',
  );

  const parsed = parseListingUrlState(original);
  const rebuilt = buildListingUrlSearchParams(parsed, {
    includeSubCategory: true,
  });

  assert.equal(rebuilt.get('q'), 'cake');
  assert.equal(rebuilt.get('minPrice'), '10');
  assert.equal(rebuilt.get('maxPrice'), '20');
  assert.equal(rebuilt.get('inStock'), 'true');
  assert.equal(rebuilt.get('page'), '2');
  assert.equal(rebuilt.get('subCategory'), 'sub-2');
  assert.deepEqual(rebuilt.getAll('attribute'), [
    'flavor:chocolate,vanilla',
    'size:small',
  ]);
});

test('areFilterStateRecordsEqual ignores value order and duplicate entries', () => {
  assert.equal(
    areFilterStateRecordsEqual(
      { size: ['small', 'large', 'small'], flavor: ['vanilla', 'chocolate'] },
      { flavor: ['chocolate', 'vanilla'], size: ['large', 'small'] },
    ),
    true,
  );
  assert.equal(
    areFilterStateRecordsEqual(
      { size: ['small'] },
      { size: ['small'], flavor: ['vanilla'] },
    ),
    false,
  );
});
