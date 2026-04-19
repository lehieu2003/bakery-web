import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { buildProductAttributeAssignmentRows } from '@/lib/product-attributes';
import { writeProductAuditLogWithClient } from '@/lib/product-audit';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/slug';
import type { UpdateProductRequest } from '@/types/api.types';

const productInclude: Prisma.ProductInclude = {
  categories: { include: { category: true } },
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

type AdminUser = {
  id: string;
  role: UserRole;
};

type ProductDetailDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findProductById: (id: string) => Promise<unknown | null>;
};

const defaultDetailDeps: ProductDetailDeps = {
  requireAdmin,
  findProductById: (id) =>
    prisma.product.findUnique({ where: { id }, include: productInclude }),
};

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

function validateVariantPayload(variants: unknown) {
  if (variants === undefined) return null;
  if (!Array.isArray(variants)) return 'Variants must be an array';

  for (const [index, variant] of variants.entries()) {
    if (!variant || typeof variant !== 'object') {
      return `Variant at index ${index} is invalid`;
    }

    const item = variant as {
      id?: unknown;
      name?: unknown;
      sku?: unknown;
      price?: unknown;
      stock?: unknown;
    };

    if (item.id !== undefined && typeof item.id !== 'string') {
      return `Variant at index ${index} has invalid id`;
    }

    if (typeof item.name !== 'string' || !item.name.trim()) {
      return `Variant at index ${index} must include a valid name`;
    }

    if (item.sku !== undefined && item.sku !== null && typeof item.sku !== 'string') {
      return `Variant at index ${index} has invalid sku`;
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

type NormalizedVariant = {
  id?: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
};

function normalizeVariantsForUpdate(variants: unknown): NormalizedVariant[] {
  if (!Array.isArray(variants)) return [];

  const normalized: NormalizedVariant[] = [];
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object') continue;

    const item = variant as {
      id?: unknown;
      name?: unknown;
      sku?: unknown;
      price?: unknown;
      stock?: unknown;
    };

    if (typeof item.name !== 'string' || !item.name.trim()) continue;

    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) continue;

    const stock = Number(item.stock);

    normalized.push({
      ...(typeof item.id === 'string' ? { id: item.id } : {}),
      name: item.name.trim(),
      sku: typeof item.sku === 'string' && item.sku.trim() ? item.sku.trim() : null,
      price,
      stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
    });
  }

  return normalized;
}

type NormalizedImage = {
  url: string;
  isPrimary: boolean;
  displayOrder: number;
};

function normalizeImagesForUpdate(images: unknown) {
  if (!Array.isArray(images)) {
    return { valid: true as const, images: null as NormalizedImage[] | null };
  }

  const normalized: NormalizedImage[] = [];

  for (let idx = 0; idx < images.length; idx += 1) {
    const img = images[idx];

    if (typeof img === 'string') {
      const url = img.trim();
      if (!url) {
        return {
          valid: false as const,
          error: `Ảnh tại vị trí ${idx} không hợp lệ`,
        };
      }

      normalized.push({
        url,
        isPrimary: normalized.length === 0,
        displayOrder: idx,
      });
      continue;
    }

    if (!img || typeof img !== 'object' || !('url' in img)) {
      return {
        valid: false as const,
        error: `Ảnh tại vị trí ${idx} không hợp lệ`,
      };
    }

    const imageObj = img as {
      url?: unknown;
      isPrimary?: unknown;
      displayOrder?: unknown;
    };

    if (typeof imageObj.url !== 'string' || !imageObj.url.trim()) {
      return {
        valid: false as const,
        error: `Ảnh tại vị trí ${idx} không hợp lệ`,
      };
    }

    normalized.push({
      url: imageObj.url.trim(),
      isPrimary:
        typeof imageObj.isPrimary === 'boolean'
          ? imageObj.isPrimary
          : normalized.length === 0,
      displayOrder:
        typeof imageObj.displayOrder === 'number' &&
        Number.isInteger(imageObj.displayOrder) &&
        imageObj.displayOrder >= 0
          ? imageObj.displayOrder
          : idx,
    });
  }

  return { valid: true as const, images: normalized };
}

function validateUpdatePayload(body: Partial<UpdateProductRequest>) {
  if (body.name !== undefined && typeof body.name !== 'string') {
    return 'Tên sản phẩm không hợp lệ';
  }

  if (body.name !== undefined && !body.name.trim()) {
    return 'Tên sản phẩm không hợp lệ';
  }

  if (body.slug !== undefined && typeof body.slug !== 'string') {
    return 'Slug không hợp lệ';
  }

  const priceError = validateNumericField('Giá sản phẩm', body.price, { min: 0 });
  if (priceError) return priceError;

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

  if (body.categoryIds !== undefined && !Array.isArray(body.categoryIds)) {
    return 'Danh mục sản phẩm không hợp lệ';
  }

  if (
    Array.isArray(body.categoryIds) &&
    body.categoryIds.some((categoryId) => typeof categoryId !== 'string' || !categoryId.trim())
  ) {
    return 'Danh mục sản phẩm không hợp lệ';
  }

  const variantError = validateVariantPayload(body.variants);
  if (variantError) {
    return variantError;
  }

  return null;
}

export function getForeignVariantIdsForProduct(
  existingVariantIds: string[],
  incomingVariantIds: string[],
) {
  const existingSet = new Set(existingVariantIds);
  return incomingVariantIds.filter((id) => !existingSet.has(id));
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

export async function handleAdminProductDetailRequest(
  _request: Pick<NextRequest, 'url'>,
  params: Promise<{ id: string }>,
  deps: ProductDetailDeps = defaultDetailDeps,
) {
  await deps.requireAdmin();

  const { id } = await params;
  const product = await deps.findProductById(id);

  if (!product) {
    return {
      status: 404,
      body: { success: false as const, error: 'Không tìm thấy sản phẩm' },
    };
  }

  return {
    status: 200,
    body: {
      success: true as const,
      data: { product },
    },
  };
}

// GET /api/admin/products/[id] - Get single product (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminProductDetailRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Admin get product error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as Partial<UpdateProductRequest> &
      Record<string, unknown>;

    const validationError = validateUpdatePayload(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const normalizedImagesResult = normalizeImagesForUpdate(body.images);
    if (!normalizedImagesResult.valid) {
      return NextResponse.json(
        { success: false, error: normalizedImagesResult.error },
        { status: 400 },
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sản phẩm' },
        { status: 404 },
      );
    }

    const normalizedSlug =
      typeof body.slug === 'string'
        ? slugify(body.slug || (typeof body.name === 'string' ? body.name : ''))
        : undefined;

    if (normalizedSlug) {
      const slugExists = await prisma.product.findFirst({
        where: { slug: normalizedSlug, id: { not: id } },
        select: { id: true },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug đã tồn tại' },
          { status: 400 },
        );
      }
      body.slug = normalizedSlug;
    }

    const { variants, categoryIds, attributeAssignments, ...rest } = body;
    const updateData = Object.fromEntries(
      Object.entries(rest).filter(
        ([key, value]) =>
          !['categories', 'category', 'imageUrl', 'images'].includes(key) &&
          value !== undefined,
      ),
    );

    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.comparePrice !== undefined)
      updateData.comparePrice = Number(updateData.comparePrice);
    if (updateData.costPrice !== undefined)
      updateData.costPrice = Number(updateData.costPrice);
    if (updateData.weight !== undefined) updateData.weight = Number(updateData.weight);

    const normalizedVariants = normalizeVariantsForUpdate(variants);

    const product = await prisma.$transaction(async (tx) => {
      if (Array.isArray(categoryIds)) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((cid: string) => ({
              productId: id,
              categoryId: cid,
            })),
          });
        }
      }

      if (normalizedImagesResult.images !== null) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (normalizedImagesResult.images.length > 0) {
          await tx.productImage.createMany({
            data: normalizedImagesResult.images.map((img) => ({
              productId: id,
              url: img.url,
              isPrimary: img.isPrimary,
              displayOrder: img.displayOrder,
            })),
          });
        }
      }

      if (Array.isArray(variants)) {
        const incomingIds = normalizedVariants
          .filter((variant) => variant.id)
          .map((variant) => variant.id as string);

        const existingVariantRows = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true },
        });
        const existingVariantIds = existingVariantRows.map((row) => row.id);
        const foreignVariantIds = getForeignVariantIdsForProduct(
          existingVariantIds,
          incomingIds,
        );

        if (foreignVariantIds.length > 0) {
          throw new Error('Variant does not belong to product');
        }

        await tx.productVariant.deleteMany({
          where: { productId: id, id: { notIn: incomingIds } },
        });

        for (const variant of normalizedVariants) {
          if (variant.id) {
            const updated = await tx.productVariant.updateMany({
              where: { id: variant.id, productId: id },
              data: {
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                stock: variant.stock,
              },
            });

            if (updated.count !== 1) {
              throw new Error('Variant does not belong to product');
            }
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                stock: variant.stock,
              },
            });
          }
        }
      }

      if (Array.isArray(attributeAssignments)) {
        await tx.productAttributeAssignment.deleteMany({
          where: { productId: id },
        });

        const assignmentRows = await buildProductAttributeAssignmentRows(
          attributeAssignments,
          id,
        );

        if (assignmentRows.length > 0) {
          await tx.productAttributeAssignment.createMany({
            data: assignmentRows,
          });
        }
      }

      await tx.product.update({
        where: { id },
        data: updateData as Prisma.ProductUpdateInput,
      });

      const updatedProduct = await tx.product.findUnique({
        where: { id },
        include: productInclude,
      });

      if (!updatedProduct) {
        throw new Error('Updated product could not be loaded');
      }

      await writeProductAuditLogWithClient(tx, {
        productId: id,
        mutationType: 'UPDATE',
        actorUserId: admin.id,
        actorRole: admin.role,
        beforeData: sanitizeProductForAudit(existingProduct),
        afterData: sanitizeProductForAudit(updatedProduct),
        metadata: {
          source: 'admin.products.update',
        },
      });

      return updatedProduct;
    });

    return NextResponse.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Admin update product error:', error);

    if (isPrismaUniqueSlugError(error)) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Variant does not belong to product') {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 },
      );
    }

    const status =
      mapAuthErrorToStatus(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sản phẩm' },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await writeProductAuditLogWithClient(tx, {
        productId: id,
        mutationType: 'DELETE',
        actorUserId: admin.id,
        actorRole: admin.role,
        beforeData: sanitizeProductForAudit(existingProduct),
        metadata: {
          source: 'admin.products.delete',
        },
      });

      await tx.product.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Xóa sản phẩm thành công' },
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
