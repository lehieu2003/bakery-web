import { NextRequest, NextResponse } from 'next/server';
import type { ProductAttributeType, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { slugifyProductAttribute } from '@/lib/product-attributes';
import { requireAdmin } from '@/lib/session';
import type {
  CreateProductAttributeRequest,
  ProductAttributeValueInput,
} from '@/types/api.types';

type AdminUser = {
  id: string;
  role: UserRole;
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

type ProductAttributesRouteDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findAttributes: () => Promise<unknown[]>;
  findAttributeBySlug: (slug: string) => Promise<{ id: string } | null>;
  findAttributeByCode: (code: string) => Promise<{ id: string } | null>;
  createAttribute: (args: {
    name: string;
    slug: string;
    code: string;
    type: ProductAttributeType;
    description: string | null;
    isRequired: boolean;
    isFilterable: boolean;
    isVariantAxis: boolean;
    isActive: boolean;
    displayOrder: number;
    values: NormalizedValue[];
  }) => Promise<unknown>;
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
type ParseValuesSuccess = { values: NormalizedValue[] };
type ParseCreateSuccess = {
  payload: {
    name: string;
    slug: string;
    code: string;
    type: ProductAttributeType;
    description: string | null;
    isRequired: boolean;
    isFilterable: boolean;
    isVariantAxis: boolean;
    isActive: boolean;
    displayOrder: number;
    values: NormalizedValue[];
  };
};

const ALLOWED_ATTRIBUTE_TYPES = new Set<ProductAttributeType>([
  'SELECT',
  'MULTI_SELECT',
  'TEXT',
  'NUMBER',
  'BOOLEAN',
]);

const defaultDeps: ProductAttributesRouteDeps = {
  requireAdmin,
  findAttributes: () =>
    prisma.productAttribute.findMany({
      include: {
        values: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  findAttributeBySlug: (slug) =>
    prisma.productAttribute.findUnique({
      where: { slug },
      select: { id: true },
    }),
  findAttributeByCode: (code) =>
    prisma.productAttribute.findUnique({
      where: { code },
      select: { id: true },
    }),
  createAttribute: (args) =>
    prisma.productAttribute.create({
      data: {
        name: args.name,
        slug: args.slug,
        code: args.code,
        type: args.type,
        description: args.description,
        isRequired: args.isRequired,
        isFilterable: args.isFilterable,
        isVariantAxis: args.isVariantAxis,
        isActive: args.isActive,
        displayOrder: args.displayOrder,
        ...(args.values.length > 0 ? { values: { create: args.values } } : {}),
      },
      include: {
        values: {
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
    }),
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

export function normalizeAttributeValues(values: unknown): ParseError | ParseValuesSuccess {
  if (values === undefined) return { values: [] };
  if (!Array.isArray(values)) {
    return { error: 'values must be an array' };
  }

  const normalized: NormalizedValue[] = [];

  for (const [index, item] of values.entries()) {
    if (!item || typeof item !== 'object') {
      return { error: `value at index ${index} is invalid` };
    }

    const value = item as ProductAttributeValueInput;
    const label = typeof value.label === 'string' ? value.label.trim() : '';
    if (!label) {
      return { error: `value at index ${index} requires label` };
    }

    const slugSource =
      typeof value.slug === 'string' && value.slug.trim()
        ? value.slug
        : label;
    const slug = slugifyProductAttribute(slugSource);
    if (!slug) {
      return { error: `value at index ${index} has invalid slug` };
    }

    const valueText =
      typeof value.value === 'string' && value.value.trim()
        ? value.value.trim()
        : label;

    const displayOrder = Number(value.displayOrder ?? index);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return {
        error: `value at index ${index} has invalid displayOrder`,
      };
    }

    if (value.colorHex !== undefined && value.colorHex !== null && typeof value.colorHex !== 'string') {
      return { error: `value at index ${index} has invalid colorHex` };
    }

    if (value.imageUrl !== undefined && value.imageUrl !== null && typeof value.imageUrl !== 'string') {
      return { error: `value at index ${index} has invalid imageUrl` };
    }

    if (value.isActive !== undefined && typeof value.isActive !== 'boolean') {
      return { error: `value at index ${index} has invalid isActive` };
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
      return { error: `Duplicate value slug: ${row.slug}` };
    }
    seenSlug.add(slugKey);

    const valueKey = row.value.toLowerCase();
    if (seenValue.has(valueKey)) {
      return { error: `Duplicate value: ${row.value}` };
    }
    seenValue.add(valueKey);
  }

  return { values: normalized };
}

function parseCreatePayload(raw: unknown): ParseError | ParseCreateSuccess {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' };
  }

  const body = raw as CreateProductAttributeRequest;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = slugifyProductAttribute(
    typeof body.slug === 'string' && body.slug.trim() ? body.slug : name,
  );
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const displayOrder = Number(body.displayOrder ?? 0);

  if (!name || !slug || !code || !body.type) {
    return { error: 'Missing required fields' };
  }

  if (!ALLOWED_ATTRIBUTE_TYPES.has(body.type as ProductAttributeType)) {
    return { error: 'Invalid attribute type' };
  }

  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    return { error: 'displayOrder must be a non-negative integer' };
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

  const parsedValues = normalizeAttributeValues(body.values);
  if ('error' in parsedValues) return parsedValues;

  return {
    payload: {
      name,
      slug,
      code,
      type: body.type as ProductAttributeType,
      description:
        typeof body.description === 'string' ? body.description.trim() || null : null,
      isRequired: body.isRequired ?? false,
      isFilterable: body.isFilterable ?? true,
      isVariantAxis: body.isVariantAxis ?? false,
      isActive: body.isActive ?? true,
      displayOrder,
      values: parsedValues.values,
    },
  };
}

export async function handleAdminProductAttributesGetRequest(
  deps: ProductAttributesRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const attributes = await deps.findAttributes();
  return {
    status: 200,
    body: {
      success: true,
      data: { attributes },
    },
  };
}

export async function handleAdminProductAttributesPostRequest(
  request: NextRequest,
  deps: ProductAttributesRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const parsed = parseCreatePayload(await request.json());

  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const [existingSlug, existingCode] = await Promise.all([
    deps.findAttributeBySlug(parsed.payload.slug),
    deps.findAttributeByCode(parsed.payload.code),
  ]);

  if (existingSlug) {
    return {
      status: 400,
      body: { success: false, error: 'Attribute slug already exists' },
    };
  }

  if (existingCode) {
    return {
      status: 400,
      body: { success: false, error: 'Attribute code already exists' },
    };
  }

  const attribute = await deps.createAttribute(parsed.payload);

  return {
    status: 200,
    body: {
      success: true,
      data: { attribute },
    },
  };
}

// GET /api/admin/product-attributes
export async function GET() {
  try {
    const result = await handleAdminProductAttributesGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin get product attributes error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: mapErrorToStatus(message) },
    );
  }
}

// POST /api/admin/product-attributes
export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminProductAttributesPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin create product attribute error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: mapErrorToStatus(message) },
    );
  }
}
