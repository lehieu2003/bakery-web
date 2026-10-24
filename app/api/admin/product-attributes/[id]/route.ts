import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, ProductAttributeType, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { slugifyProductAttribute } from '@/lib/product-attributes';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import type {
  ProductAttributeValueInput,
  UpdateProductAttributeRequest,
} from '@/types/api.types';

type AdminUser = {
  id: string;
  role: UserRole;
};

type AttributeValueRow = {
  id: string;
  slug: string;
  value: string;
};

type NormalizedValue = {
  label: string;
  value: string;
  slug: string;
  colorHex: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
};

type DetailDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findAttributeById: (id: string) => Promise<unknown | null>;
  findAttributeForUpdate: (id: string) => Promise<{
    id: string;
    slug: string;
    code: string;
    values: AttributeValueRow[];
  } | null>;
  findAttributeBySlug: (slug: string, excludeId: string) => Promise<{ id: string } | null>;
  findAttributeByCode: (code: string, excludeId: string) => Promise<{ id: string } | null>;
  countAssignmentsByValueIds: (valueIds: string[], tx?: Prisma.TransactionClient) => Promise<number>;
  deleteValuesByIds: (valueIds: string[], tx?: Prisma.TransactionClient) => Promise<void>;
  createValue: (
    attributeId: string,
    value: NormalizedValue,
    tx?: Prisma.TransactionClient,
  ) => Promise<void>;
  updateValueById: (
    id: string,
    value: NormalizedValue,
    tx?: Prisma.TransactionClient,
  ) => Promise<void>;
  updateAttribute: (
    id: string,
    data: Prisma.ProductAttributeUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => Promise<void>;
  findAttributeDetailById: (id: string, tx?: Prisma.TransactionClient) => Promise<unknown | null>;
  deleteAttribute: (id: string) => Promise<void>;
  withTransaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type ParseError = { error: string };
type ParseValuesSuccess = { values: NormalizedValue[] | undefined };
type ParsedUpdatePayload = {
  name?: string;
  slug?: string;
  code?: string;
  type?: ProductAttributeType;
  description?: string | null;
  isRequired?: boolean;
  isFilterable?: boolean;
  isVariantAxis?: boolean;
  isActive?: boolean;
  displayOrder?: number;
};
type ParseUpdateSuccess = {
  payload: ParsedUpdatePayload;
  values: NormalizedValue[] | undefined;
};

const ALLOWED_ATTRIBUTE_TYPES = new Set<ProductAttributeType>([
  'SELECT',
  'MULTI_SELECT',
  'TEXT',
  'NUMBER',
  'BOOLEAN',
]);

const defaultDeps: DetailDeps = {
  requireAdmin,
  findAttributeById: (id) =>
    prisma.productAttribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
    }),
  findAttributeForUpdate: (id) =>
    prisma.productAttribute.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        code: true,
        values: {
          select: {
            id: true,
            slug: true,
            value: true,
          },
        },
      },
    }),
  findAttributeBySlug: (slug, excludeId) =>
    prisma.productAttribute.findFirst({
      where: {
        slug,
        id: { not: excludeId },
      },
      select: { id: true },
    }),
  findAttributeByCode: (code, excludeId) =>
    prisma.productAttribute.findFirst({
      where: {
        code,
        id: { not: excludeId },
      },
      select: { id: true },
    }),
  countAssignmentsByValueIds: (valueIds, tx) =>
    (tx ?? prisma).productAttributeAssignment.count({
      where: { valueId: { in: valueIds } },
    }),
  deleteValuesByIds: async (valueIds, tx) => {
    await (tx ?? prisma).productAttributeValue.deleteMany({
      where: { id: { in: valueIds } },
    });
  },
  createValue: async (attributeId, value, tx) => {
    await (tx ?? prisma).productAttributeValue.create({
      data: {
        attributeId,
        ...value,
      },
    });
  },
  updateValueById: async (id, value, tx) => {
    await (tx ?? prisma).productAttributeValue.update({
      where: { id },
      data: value,
    });
  },
  updateAttribute: async (id, data, tx) => {
    await (tx ?? prisma).productAttribute.update({
      where: { id },
      data,
      select: { id: true },
    });
  },
  findAttributeDetailById: (id, tx) =>
    (tx ?? prisma).productAttribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
    }),
  deleteAttribute: async (id) => {
    await prisma.productAttribute.delete({ where: { id } });
  },
  withTransaction: (fn) => prisma.$transaction((tx) => fn(tx)),
};


function normalizeValues(values: unknown): ParseError | ParseValuesSuccess {
  if (values === undefined) return { values: undefined };
  if (!Array.isArray(values)) return { error: 'values phải là một mảng' };

  const normalized: NormalizedValue[] = [];
  for (const [index, item] of values.entries()) {
    if (!item || typeof item !== 'object') {
      return { error: `Giá trị tại vị trí ${index} không hợp lệ` };
    }

    const value = item as ProductAttributeValueInput;
    const label = typeof value.label === 'string' ? value.label.trim() : '';
    if (!label) {
      return { error: `Giá trị tại vị trí ${index} cần nhãn` };
    }

    const slugSource =
      typeof value.slug === 'string' && value.slug.trim()
        ? value.slug
        : label;
    const slug = slugifyProductAttribute(slugSource);
    if (!slug) {
      return { error: `Giá trị tại vị trí ${index} có slug không hợp lệ` };
    }

    const valueText =
      typeof value.value === 'string' && value.value.trim()
        ? value.value.trim()
        : label;

    const displayOrder = Number(value.displayOrder ?? index);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return {
        error: `Giá trị tại vị trí ${index} có thứ tự hiển thị không hợp lệ`,
      };
    }

    if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
      return { error: `value at index ${index} has invalid isActive` };
    }

    if (value.colorHex !== undefined && value.colorHex !== null && typeof value.colorHex !== 'string') {
      return { error: `Giá trị tại vị trí ${index} có màu không hợp lệ` };
    }

    if (value.imageUrl !== undefined && value.imageUrl !== null && typeof value.imageUrl !== 'string') {
      return { error: `Giá trị tại vị trí ${index} có ảnh không hợp lệ` };
    }

    normalized.push({
      label,
      value: valueText,
      slug,
      colorHex:
        typeof value.colorHex === 'string' ? value.colorHex.trim() || null : null,
      imageUrl:
        typeof value.imageUrl === 'string' ? value.imageUrl.trim() || null : null,
      displayOrder,
      isActive: value.isActive ?? true,
    });
  }

  const seenSlug = new Set<string>();
  const seenValue = new Set<string>();
  for (const row of normalized) {
    const slugKey = row.slug.toLowerCase();
    if (seenSlug.has(slugKey)) {
      return { error: `Trùng slug giá trị: ${row.slug}` };
    }
    seenSlug.add(slugKey);

    const valueKey = row.value.toLowerCase();
    if (seenValue.has(valueKey)) {
      return { error: `Trùng giá trị: ${row.value}` };
    }
    seenValue.add(valueKey);
  }

  return { values: normalized };
}

function parseUpdatePayload(raw: unknown): ParseError | ParseUpdateSuccess {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Dữ liệu không hợp lệ' };
  }

  const body = raw as UpdateProductAttributeRequest;

  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return { error: 'name must be a non-empty string' };
  }

  if (body.slug !== undefined && (typeof body.slug !== 'string' || !body.slug.trim())) {
    return { error: 'slug must be a non-empty string' };
  }

  if (body.code !== undefined && (typeof body.code !== 'string' || !body.code.trim())) {
    return { error: 'code must be a non-empty string' };
  }

  if (body.type !== undefined && !ALLOWED_ATTRIBUTE_TYPES.has(body.type as ProductAttributeType)) {
    return { error: 'Loại thuộc tính không hợp lệ' };
  }

  if (
    body.displayOrder !== undefined &&
    (!Number.isInteger(body.displayOrder) || Number(body.displayOrder) < 0)
  ) {
    return { error: 'Thứ tự hiển thị phải là số nguyên không âm' };
  }

  if (body.isRequired !== undefined && typeof body.isRequired !== 'boolean') {
    return { error: 'isRequired must be a boolean' };
  }
  if (body.isFilterable !== undefined && typeof body.isFilterable !== 'boolean') {
    return { error: 'isFilterable must be a boolean' };
  }
  if (body.isVariantAxis !== undefined && typeof body.isVariantAxis !== 'boolean') {
    return { error: 'isVariantAxis must be a boolean' };
  }
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return { error: 'isActive must be a boolean' };
  }

  const parsedValues = normalizeValues(body.values);
  if ('error' in parsedValues) return parsedValues;

  return {
    payload: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.slug !== undefined
        ? { slug: slugifyProductAttribute(body.slug.trim()) }
        : {}),
      ...(body.code !== undefined ? { code: body.code.trim() } : {}),
      ...(body.type !== undefined ? { type: body.type as ProductAttributeType } : {}),
      ...(body.description !== undefined
        ? {
            description:
              typeof body.description === 'string'
                ? body.description.trim() || null
                : null,
          }
        : {}),
      ...(body.isRequired !== undefined ? { isRequired: body.isRequired } : {}),
      ...(body.isFilterable !== undefined ? { isFilterable: body.isFilterable } : {}),
      ...(body.isVariantAxis !== undefined ? { isVariantAxis: body.isVariantAxis } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.displayOrder !== undefined
        ? { displayOrder: Number(body.displayOrder) }
        : {}),
    },
    values: parsedValues.values,
  };
}

export async function handleAdminProductAttributeDetailGetRequest(
  params: Promise<{ id: string }>,
  deps: DetailDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const attribute = await deps.findAttributeById(id);
  if (!attribute) {
    return {
      status: 404,
      body: { success: false, error: 'Không tìm thấy thuộc tính' },
    };
  }

  return {
    status: 200,
    body: { success: true, data: { attribute } },
  };
}

export async function handleAdminProductAttributeUpdateRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: DetailDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const existing = await deps.findAttributeForUpdate(id);
  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Không tìm thấy thuộc tính' },
    };
  }

  const parsed = parseUpdatePayload(await request.json());
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  if (parsed.payload.slug && parsed.payload.slug !== existing.slug) {
    const slugExists = await deps.findAttributeBySlug(parsed.payload.slug, id);
    if (slugExists) {
      return {
        status: 400,
        body: { success: false, error: 'Thuộc tính đã tồn tại (slug)' },
      };
    }
  }

  if (parsed.payload.code && parsed.payload.code !== existing.code) {
    const codeExists = await deps.findAttributeByCode(parsed.payload.code, id);
    if (codeExists) {
      return {
        status: 400,
        body: { success: false, error: 'Thuộc tính đã tồn tại (mã)' },
      };
    }
  }

  const attribute = await deps.withTransaction(async (tx) => {
    await deps.updateAttribute(id, parsed.payload, tx);

    if (parsed.values) {
      const existingBySlug = new Map(
        existing.values.map((value) => [value.slug.toLowerCase(), value]),
      );

      const nextSlugKeys = new Set(parsed.values.map((value) => value.slug.toLowerCase()));
      const toDelete = existing.values.filter(
        (value) => !nextSlugKeys.has(value.slug.toLowerCase()),
      );

      if (toDelete.length > 0) {
        const assignedCount = await deps.countAssignmentsByValueIds(
          toDelete.map((value) => value.id),
          tx,
        );

        if (assignedCount > 0) {
          throw new Error('Không thể xóa giá trị đang được gán cho sản phẩm');
        }

        await deps.deleteValuesByIds(
          toDelete.map((value) => value.id),
          tx,
        );
      }

      for (const value of parsed.values) {
        const existingValue = existingBySlug.get(value.slug.toLowerCase());
        if (existingValue) {
          await deps.updateValueById(existingValue.id, value, tx);
        } else {
          await deps.createValue(id, value, tx);
        }
      }
    }

    return deps.findAttributeDetailById(id, tx);
  });

  return {
    status: 200,
    body: {
      success: true,
      data: { attribute },
    },
  };
}

export async function handleAdminProductAttributeDeleteRequest(
  params: Promise<{ id: string }>,
  deps: DetailDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const existing = await deps.findAttributeById(id);
  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Không tìm thấy thuộc tính' },
    };
  }

  await deps.deleteAttribute(id);

  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Deleted attribute' },
    },
  };
}

// GET /api/admin/product-attributes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminProductAttributeDetailGetRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin get product attribute detail error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}

// PUT /api/admin/product-attributes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminProductAttributeUpdateRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin update product attribute error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status =
      message === 'Không thể xóa giá trị đang được gán cho sản phẩm'
        ? 400
        : mapAuthErrorToStatus(message);

    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// DELETE /api/admin/product-attributes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminProductAttributeDeleteRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin delete product attribute error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}


