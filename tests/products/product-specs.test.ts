import test from 'node:test';
import assert from 'node:assert/strict';
import { productSpecRows } from '@/lib/product-specs';
import type { ProductAttributeAssignment } from '@/types/api.types';

function attribute(id: string, name: string, type: string, isActive = true) {
  return { id, name, type, isActive } as unknown as ProductAttributeAssignment['attribute'];
}

function assign(
  attr: ProductAttributeAssignment['attribute'],
  fields: Partial<ProductAttributeAssignment>,
): ProductAttributeAssignment {
  return { attribute: attr, value: null, textValue: null, numberValue: null, booleanValue: null, ...fields } as ProductAttributeAssignment;
}

test('a product with no attributes entered shows no spec rows', () => {
  assert.deepEqual(productSpecRows(undefined), []);
  assert.deepEqual(productSpecRows([]), []);
});

test('rows come only from what was entered, formatted by attribute type', () => {
  const origin = attribute('a1', 'Xuất xứ', 'SELECT');
  const shelf = attribute('a2', 'Hạn sử dụng', 'TEXT');
  const weight = attribute('a3', 'Khối lượng (g)', 'NUMBER');
  const glutenFree = attribute('a4', 'Không gluten', 'BOOLEAN');

  const rows = productSpecRows([
    assign(origin, { value: { label: 'Madagascar' } as never }),
    assign(shelf, { textValue: ' 24 tháng ' }),
    assign(weight, { numberValue: 1000 }),
    assign(glutenFree, { booleanValue: false }),
  ]);

  assert.deepEqual(rows, [
    { label: 'Xuất xứ', value: 'Madagascar' },
    { label: 'Hạn sử dụng', value: '24 tháng' },
    { label: 'Khối lượng (g)', value: '1.000' },
    { label: 'Không gluten', value: 'Không' },
  ]);
});

test('multi-select values join into one row; empty and inactive are skipped', () => {
  const flavors = attribute('a1', 'Hương vị', 'MULTI_SELECT');
  const hidden = attribute('a2', 'Mã nội bộ', 'TEXT', false);
  const blank = attribute('a3', 'Ghi chú', 'TEXT');

  const rows = productSpecRows([
    assign(flavors, { value: { label: 'Đào' } as never }),
    assign(flavors, { value: { label: 'Cam sả' } as never }),
    assign(hidden, { textValue: 'X-01' }),
    assign(blank, { textValue: '   ' }),
  ]);

  assert.deepEqual(rows, [{ label: 'Hương vị', value: 'Đào, Cam sả' }]);
});
