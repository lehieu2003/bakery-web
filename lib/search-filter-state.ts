export type FilterStateRecord = Record<string, string[]>;

export type ListingUrlState = {
  search: string;
  page: number;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  subCategoryId: string;
  selectedFilters: FilterStateRecord;
};

function normalizeFilterValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function normalizePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function normalizeNumericString(value: string | null) {
  if (value === null || value.trim() === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '';
}

function parseAttributeTokens(values: string[]) {
  const entries: Array<[string, string[]]> = [];
  for (const token of values) {
    const [attributeSlug, rawValues] = token.split(':');
    if (!attributeSlug || !rawValues) continue;
    const valueSlugs = rawValues
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!valueSlugs.length) continue;
    entries.push([attributeSlug, valueSlugs]);
  }

  const record: FilterStateRecord = {};
  for (const [attributeSlug, valueSlugs] of entries) {
    const existing = record[attributeSlug] ?? [];
    const merged = [...existing, ...valueSlugs];
    record[attributeSlug] = Array.from(new Set(merged));
  }
  return record;
}

export function parseListingUrlState(
  searchParams: URLSearchParams,
  options?: { defaultPage?: number },
): ListingUrlState {
  const defaultPage = options?.defaultPage ?? 1;
  return {
    search: (searchParams.get('q') ?? searchParams.get('search') ?? '').trim(),
    page: normalizePositiveInt(searchParams.get('page'), defaultPage),
    minPrice: normalizeNumericString(searchParams.get('minPrice')),
    maxPrice: normalizeNumericString(searchParams.get('maxPrice')),
    inStockOnly: searchParams.get('inStock') === 'true',
    subCategoryId: (searchParams.get('subCategory') || 'all').trim() || 'all',
    selectedFilters: parseAttributeTokens(searchParams.getAll('attribute')),
  };
}

export function buildListingUrlSearchParams(
  state: ListingUrlState,
  options?: { includeSubCategory?: boolean },
) {
  const params = new URLSearchParams();

  if (state.search) params.set('q', state.search);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.minPrice) params.set('minPrice', state.minPrice);
  if (state.maxPrice) params.set('maxPrice', state.maxPrice);
  if (state.inStockOnly) params.set('inStock', 'true');
  if (options?.includeSubCategory && state.subCategoryId !== 'all') {
    params.set('subCategory', state.subCategoryId);
  }

  const attributeSlugs = Object.keys(state.selectedFilters).sort();
  for (const attributeSlug of attributeSlugs) {
    const values = state.selectedFilters[attributeSlug] ?? [];
    const uniqueValues = normalizeFilterValues(values);
    if (!uniqueValues.length) continue;
    params.append('attribute', `${attributeSlug}:${uniqueValues.join(',')}`);
  }

  return params;
}

export function areFilterStateRecordsEqual(
  left: FilterStateRecord,
  right: FilterStateRecord,
) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  for (let i = 0; i < leftKeys.length; i += 1) {
    if (leftKeys[i] !== rightKeys[i]) return false;
    const leftValues = normalizeFilterValues(left[leftKeys[i]] ?? []);
    const rightValues = normalizeFilterValues(right[rightKeys[i]] ?? []);
    if (leftValues.length !== rightValues.length) return false;
    for (let j = 0; j < leftValues.length; j += 1) {
      if (leftValues[j] !== rightValues[j]) return false;
    }
  }
  return true;
}
