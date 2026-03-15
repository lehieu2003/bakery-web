import type { Prisma, ProductAttribute, ProductAttributeType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface ParsedAttributeFilter {
  attributeSlug: string;
  valueSlugs: string[];
}

export interface IncomingProductAttributeAssignment {
  attributeId: string;
  valueIds?: string[];
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
}

export function slugifyProductAttribute(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseAttributeFilters(values: string[]): ParsedAttributeFilter[] {
  const filters: ParsedAttributeFilter[] = [];

  for (const raw of values) {
    const [attributeSlug, valuePart] = raw.split(':');
    if (!attributeSlug || !valuePart) continue;

    const valueSlugs = valuePart
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (valueSlugs.length === 0) continue;

    filters.push({
      attributeSlug: attributeSlug.trim(),
      valueSlugs,
    });
  }

  return filters;
}

function buildValueKey(
  attributeType: ProductAttributeType,
  assignment: IncomingProductAttributeAssignment,
  valueId?: string,
) {
  if (valueId) return valueId;
  if (attributeType === 'TEXT') return `text:${assignment.textValue?.trim() ?? ''}`;
  if (attributeType === 'NUMBER') return `number:${assignment.numberValue ?? ''}`;
  if (attributeType === 'BOOLEAN') return `boolean:${assignment.booleanValue ? 'true' : 'false'}`;
  return 'option:missing';
}

function pickTypedValue(
  attributeType: ProductAttributeType,
  assignment: IncomingProductAttributeAssignment,
) {
  if (attributeType === 'TEXT') {
    const textValue = assignment.textValue?.trim();
    if (!textValue) throw new Error('Typed text attributes require textValue');
    return { textValue, numberValue: null, booleanValue: null };
  }

  if (attributeType === 'NUMBER') {
    if (typeof assignment.numberValue !== 'number' || Number.isNaN(assignment.numberValue)) {
      throw new Error('Typed number attributes require numberValue');
    }
    return { textValue: null, numberValue: assignment.numberValue, booleanValue: null };
  }

  if (attributeType === 'BOOLEAN') {
    if (typeof assignment.booleanValue !== 'boolean') {
      throw new Error('Typed boolean attributes require booleanValue');
    }
    return { textValue: null, numberValue: null, booleanValue: assignment.booleanValue };
  }

  return { textValue: null, numberValue: null, booleanValue: null };
}

export async function buildProductAttributeAssignmentRows(
  assignments: IncomingProductAttributeAssignment[] | undefined,
  productId?: string,
) {
  if (!assignments || assignments.length === 0) {
    return [] as Prisma.ProductAttributeAssignmentCreateManyInput[];
  }

  const attributeIds = [...new Set(assignments.map((assignment) => assignment.attributeId).filter(Boolean))];
  const attributes = await prisma.productAttribute.findMany({
    where: { id: { in: attributeIds } },
    include: {
      values: {
        select: { id: true, attributeId: true, isActive: true },
      },
    },
  });

  const attributeMap = new Map<string, ProductAttribute & { values: { id: string; attributeId: string; isActive: boolean }[] }>();
  for (const attribute of attributes) {
    attributeMap.set(attribute.id, attribute);
  }

  const rows: Prisma.ProductAttributeAssignmentCreateManyInput[] = [];
  const seenKeys = new Set<string>();

  for (const assignment of assignments) {
    const attribute = attributeMap.get(assignment.attributeId);
    if (!attribute) {
      throw new Error(`Invalid attributeId: ${assignment.attributeId}`);
    }

    if (attribute.type === 'SELECT' || attribute.type === 'MULTI_SELECT') {
      const valueIds = [...new Set((assignment.valueIds ?? []).filter(Boolean))];
      if (valueIds.length === 0) {
        if (attribute.isRequired) {
          throw new Error(`Attribute "${attribute.name}" requires at least one value`);
        }
        continue;
      }

      if (attribute.type === 'SELECT' && valueIds.length > 1) {
        throw new Error(`Attribute "${attribute.name}" only accepts one value`);
      }

      for (const valueId of valueIds) {
        const value = attribute.values.find((item) => item.id === valueId);
        if (!value || value.attributeId !== attribute.id || !value.isActive) {
          throw new Error(`Invalid value for attribute "${attribute.name}"`);
        }

        const valueKey = buildValueKey(attribute.type, assignment, valueId);
        const dedupeKey = `${assignment.attributeId}:${valueKey}`;
        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        rows.push({
          productId: productId ?? '',
          attributeId: attribute.id,
          valueId,
          valueKey,
          textValue: null,
          numberValue: null,
          booleanValue: null,
        });
      }

      continue;
    }

    const typedValue = pickTypedValue(attribute.type, assignment);
    const valueKey = buildValueKey(attribute.type, assignment);
    const dedupeKey = `${assignment.attributeId}:${valueKey}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    rows.push({
      productId: productId ?? '',
      attributeId: attribute.id,
      valueId: null,
      valueKey,
      textValue: typedValue.textValue,
      numberValue: typedValue.numberValue,
      booleanValue: typedValue.booleanValue,
    });
  }

  return rows;
}

export function buildProductAttributeWhere(
  filters: ParsedAttributeFilter[],
): Prisma.ProductWhereInput[] {
  return filters.map((filter) => ({
    attributeAssignments: {
      some: {
        attribute: { slug: filter.attributeSlug, isActive: true, isFilterable: true },
        value: { slug: { in: filter.valueSlugs }, isActive: true },
      },
    },
  }));
}

