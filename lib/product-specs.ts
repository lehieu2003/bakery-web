import type { ProductAttributeAssignment } from '@/types/api.types';

export type ProductSpecRow = { label: string; value: string };

function formatAssignmentValue(assignment: ProductAttributeAssignment): string | null {
  switch (assignment.attribute?.type) {
    case 'SELECT':
    case 'MULTI_SELECT':
      return assignment.value?.label?.trim() || null;
    case 'TEXT':
      return assignment.textValue?.trim() || null;
    case 'NUMBER':
      return assignment.numberValue == null
        ? null
        : assignment.numberValue.toLocaleString('vi-VN');
    case 'BOOLEAN':
      return assignment.booleanValue == null
        ? null
        : assignment.booleanValue
          ? 'Có'
          : 'Không';
    default:
      return null;
  }
}

/**
 * The spec table of a product page: only what the shop entered for this
 * product as attributes, never a placeholder. Values of one attribute
 * (multi-select) are joined; inactive attributes and empty values are
 * skipped, so a product with nothing entered shows no table at all.
 * Order follows the assignments (the API sorts them by attribute order).
 */
export function productSpecRows(
  assignments: ProductAttributeAssignment[] | undefined,
): ProductSpecRow[] {
  const rows = new Map<string, ProductSpecRow>();
  for (const assignment of assignments ?? []) {
    const attribute = assignment.attribute;
    if (!attribute || !attribute.isActive) continue;
    const value = formatAssignmentValue(assignment);
    if (!value) continue;
    const row = rows.get(attribute.id);
    if (row) {
      if (!row.value.split(', ').includes(value)) row.value += `, ${value}`;
    } else {
      rows.set(attribute.id, { label: attribute.name, value });
    }
  }
  return [...rows.values()];
}
