import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { buildProductAttributeAssignmentRows } from '@/lib/product-attributes';
import { writeProductAuditLogWithClient } from '@/lib/product-audit';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/slug';
import type { CreateProductRequest } from '@/types/api.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type AdminUser = {
  id: string;
  role: UserRole;
};

type ProductListDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findProducts: (args: {
    where: Prisma.ProductWhereInput;
    skip: number;
    take: number;
  }) => Promise<unknown[]>;
  countProducts: (where: Prisma.ProductWhereInput) => Promise<number>;
  findChildCategoryIds: (parentId: string) => Promise<string[]>;
};

const productInclude: Prisma.ProductInclude = {
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
  images: { orderBy: { displayOrder: 'asc' } },
  variants: true,
  attributeAssignments: {
    include: {
      attribute: true,
      value: true,
    },
    orderBy: [{ attribute: { displayOrder: 'asc' } }, { createdAt: 'asc' }],
  },
};

const defaultListDeps: ProductListDeps = {
  requireAdmin,
  findProducts: ({ where, skip, take }) =>
    prisma.product.findMany({
      where,
      include: productInclude,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  countProducts: (where) => prisma.product.count({ where }),
  findChildCategoryIds: async (parentId) => {
    const rows = await prisma.category.findMany({
      where: { parentId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
};

function normalizePage(pageRaw: string | null) {
  const parsed = Number.parseInt(pageRaw ?? '', 10);
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
}

function normalizeLimit(limitRaw: string | null) {
  const parsed = Number.parseInt(limitRaw ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function sanitizeProductForAudit(product: unknown) {
  if (!product || typeof product !== 'object') {
    return null;
  }

  const p = product as {
    id?: string;
    name?: string;
    slug?: string;
    price?: unknown;
    stock?: unknown;
    isActive?: boolean;
    isFeatured?: boolean;
    categories?: Array<{ categoryId?: string }>;
    variants?: Array<{
      id?: string;
      name?: string;
      sku?: string | null;
      price?: unknown;
      stock?: unknown;
    }>;
    images?: Array<{ id?: string; url?: string; isPrimary?: boolean }>;
  };

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    stock: p.stock,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    categoryIds: (p.categories ?? []).map((c) => c.categoryId).filter(Boolean),
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku ?? null,
      price: v.price,
      stock: v.stock,
    })),
    images: (p.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.isPrimary,
    })),
  };
}

function buildListWhere(url: string) {
  const { searchParams } = new URL(url);
  const categoryId = searchParams.get('categoryId')?.trim();
  const search = searchParams.get('search')?.trim();

  const where: Prisma.ProductWhereInput = {};

  return { where, categoryId, search };
}

export function validateVariantPayload(variants: unknown) {
  if (variants === undefined) return null;
  if (!Array.isArray(variants)) return 'Variants must be an array';

  for (const [index, variant] of variants.entries()) {
    if (!variant || typeof variant !== 'object') {
      return `Variant at index ${index} is invalid`;
    }

    const item = variant as {
      name?: unknown;
      price?: unknown;
      stock?: unknown;
      sku?: unknown;
      id?: unknown;
    };

    if (item.id !== undefined && typeof item.id !== 'string') {
      return `Variant at index ${index} has invalid id`;
    }

    if (item.sku !== undefined && item.sku !== null && typeof item.sku !== 'string') {
      return `Variant at index ${index} has invalid sku`;
    }

    if (typeof item.name !== 'string' || !item.name.trim()) {
      return `Variant at index ${index} must include a valid name`;
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      return `Variant at index ${index} must include a valid price`;
    }

    if (
      item.stock !== undefined &&
      (!Number.isInteger(item.stock) || Number(item.stock) < 0)
    ) {
      return `Variant at index ${index} must include a valid stock`;
    }
  }

  return null;
}

export function normalizeVariantCreateData(variants: unknown) {
  if (!Array.isArray(variants)) return [];

  const normalized: {
    name: string;
    sku: string | null;
    price: number;
    stock: number;
  }[] = [];

  for (const variant of variants) {
    if (!variant || typeof variant !== 'object') continue;

    const item = variant as {
      name?: unknown;
      sku?: unknown;
      price?: unknown;
      stock?: unknown;
    };

    if (typeof item.name !== 'string' || !item.name.trim()) {
      continue;
    }

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      continue;
    }

    const stock = Number(item.stock);
    normalized.push({
      name: item.name.trim(),
      sku: typeof item.sku === 'string' && item.sku.trim() ? item.sku.trim() : null,
      price,
      stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
    });
  }

  return normalized;
}

function validateNumericField(name: string, value: unknown, opts: { min?: number; integer?: boolean }) {
  if (value === undefined || value === null) return null;

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return `${name} không hợp lệ`;
  }

  if (opts.integer && !Number.isInteger(numberValue)) {
    return `${name} không hợp lệ`;
  }

  if (opts.min !== undefined && numberValue < opts.min) {
    return `${name} không hợp lệ`;
  }

  return null;
}

function validateCreatePayload(body: Partial<CreateProductRequest>) {
  if (!body.name || !body.name.trim()) {
    return 'Thiếu thông tin bắt buộc';
  }

  if (body.slug !== undefined && typeof body.slug !== 'string') {
    return 'Slug không hợp lệ';
  }

  const normalizedPrice = Number(body.price);
  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    return 'Giá sản phẩm không hợp lệ';
  }

  const stockError = validateNumericField('Số lượng tồn kho', body.stock, {
    min: 0,
    integer: true,
  });
  if (stockError) return stockError;

  const comparePriceError = validateNumericField('Giá so sánh', body.comparePrice, {
    min: 0,
  });
  if (comparePriceError) return comparePriceError;

  const costPriceError = validateNumericField('Giá vốn', body.costPrice, {
    min: 0,
  });
  if (costPriceError) return costPriceError;

  const weightError = validateNumericField('Khối lượng', body.weight, {
    min: 0,
  });
  if (weightError) return weightError;

  if (body.categoryIds && !Array.isArray(body.categoryIds)) {
    return 'Danh mục sản phẩm không hợp lệ';
  }

  if (Array.isArray(body.categoryIds) && body.categoryIds.some((id) => typeof id !== 'string' || !id.trim())) {
    return 'Danh mục sản phẩm không hợp lệ';
  }

  const variantError = validateVariantPayload(body.variants);
  if (variantError) {
    return variantError;
  }

  return null;
}

function isPrismaUniqueSlugError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; meta?: { target?: unknown } };
  if (maybe.code !== 'P2002') return false;

  const target = maybe.meta?.target;
  if (Array.isArray(target)) {
    return target.includes('slug');
  }

  return false;
}

export async function handleAdminProductsGetRequest(
  request: Pick<NextRequest, 'url'>,
  deps: ProductListDeps = defaultListDeps,
) {
  const { searchParams } = new URL(request.url);
  const page = normalizePage(searchParams.get('page'));
  const limit = normalizeLimit(searchParams.get('limit'));

  await deps.requireAdmin();

  const { where, categoryId, search } = buildListWhere(request.url);

  if (categoryId) {
    const childCategoryIds = await deps.findChildCategoryIds(categoryId);
    where.categories = {
      some: { categoryId: { in: [categoryId, ...childCategoryIds] } },
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    deps.findProducts({ where, skip, take: limit }),
    deps.countProducts(where),
  ]);

  return {
    status: 200,
    body: {
      success: true as const,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    },
  };
}

// GET /api/admin/products - List all products (admin only)
export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminProductsGetRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin products list error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// POST /api/admin/products - Create product
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = (await request.json()) as Partial<CreateProductRequest>;
    const validationError = validateCreatePayload(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const {
      name,
      description,
      shortDescription,
      price,
      comparePrice,
      costPrice,
      sku,
      barcode,
      categoryIds,
      stock,
      trackStock,
      weight,
      images,
      variants,
      attributeAssignments,
      isActive,
      isFeatured,
    } = body;
    const slugSource =
      typeof body.slug === 'string' && body.slug.trim()
        ? body.slug
        : (name ?? '');
    const slug = slugify(slugSource);

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug không hợp lệ' },
        { status: 400 },
      );
    }

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    const imageCreateData: {
      url: string;
      isPrimary: boolean;
      displayOrder: number;
    }[] = [];
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const url = typeof img === 'string' ? img.trim() : img?.url?.trim();
        if (!url) {
          return NextResponse.json(
            { success: false, error: `Ảnh tại vị trí ${i} không hợp lệ` },
            { status: 400 },
          );
        }

        if (!imageCreateData.some((d) => d.url === url)) {
          imageCreateData.push({
            url,
            isPrimary: imageCreateData.length === 0,
            displayOrder: i,
          });
        }
      }
    }

    const variantCreateData = normalizeVariantCreateData(variants);

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name: name!.trim(),
          slug,
          description,
          shortDescription,
          price: Number(price),
          comparePrice:
            comparePrice === undefined || comparePrice === null
              ? undefined
              : Number(comparePrice),
          costPrice:
            costPrice === undefined || costPrice === null
              ? undefined
              : Number(costPrice),
          sku,
          barcode,
          stock: stock === undefined ? 0 : Number(stock),
          trackStock: trackStock !== undefined ? trackStock : true,
          weight:
            weight === undefined || weight === null ? undefined : Number(weight),
          isActive: isActive !== undefined ? isActive : true,
          isFeatured: isFeatured || false,
          ...(imageCreateData.length > 0
            ? { images: { create: imageCreateData } }
            : {}),
          ...(variantCreateData.length > 0
            ? { variants: { create: variantCreateData } }
            : {}),
          ...(Array.isArray(categoryIds) && categoryIds.length > 0
            ? {
                categories: {
                  create: categoryIds.map((categoryId) => ({ categoryId })),
                },
              }
            : {}),
        },
        include: productInclude,
      });

      if (Array.isArray(attributeAssignments)) {
        const assignmentRows = await buildProductAttributeAssignmentRows(
          attributeAssignments,
          createdProduct.id,
        );

        if (assignmentRows.length > 0) {
          await tx.productAttributeAssignment.createMany({
            data: assignmentRows,
          });
        }
      }

      const productWithAttributes = await tx.product.findUnique({
        where: { id: createdProduct.id },
        include: productInclude,
      });

      if (!productWithAttributes) {
        throw new Error('Created product could not be loaded');
      }

      await writeProductAuditLogWithClient(tx, {
        productId: productWithAttributes.id,
        mutationType: 'CREATE',
        actorUserId: admin.id,
        actorRole: admin.role,
        afterData: sanitizeProductForAudit(productWithAttributes),
        metadata: {
          source: 'admin.products.create',
        },
      });

      return productWithAttributes;
    });

    return NextResponse.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Admin create product error:', error);

    if (isPrismaUniqueSlugError(error)) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
