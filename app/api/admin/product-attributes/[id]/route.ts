import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { UpdateProductAttributeRequest, ProductAttributeValueInput } from '@/types/api.types';
import { slugifyProductAttribute } from '@/lib/product-attributes';

function normalizeValues(values: ProductAttributeValueInput[] | undefined) {
  return (values ?? [])
    .map((value, index) => {
      const label = value.label.trim();
      if (!label) return null;

      return {
        label,
        value: value.value?.trim() || label,
        slug: slugifyProductAttribute(value.slug?.trim() || label),
        colorHex: value.colorHex?.trim() || null,
        imageUrl: value.imageUrl?.trim() || null,
        displayOrder: value.displayOrder ?? index,
        isActive: value.isActive ?? true,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

// GET /api/admin/product-attributes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const attribute = await prisma.productAttribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { success: false, error: 'Attribute not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { attribute },
    });
  } catch (error) {
    console.error('Admin get product attribute detail error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: message === 'Unauthorized' ? 401 : 500 },
    );
  }
}

// PUT /api/admin/product-attributes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as UpdateProductAttributeRequest;

    const existing = await prisma.productAttribute.findUnique({
      where: { id },
      include: { values: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attribute not found' },
        { status: 404 },
      );
    }

    const nextSlug =
      body.slug !== undefined
        ? slugifyProductAttribute(body.slug?.trim() || body.name?.trim() || '')
        : undefined;
    if (nextSlug && nextSlug !== existing.slug) {
      const slugExists = await prisma.productAttribute.findFirst({
        where: { slug: nextSlug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Attribute slug already exists' },
          { status: 400 },
        );
      }
    }

    const nextCode = body.code?.trim();
    if (nextCode && nextCode !== existing.code) {
      const codeExists = await prisma.productAttribute.findFirst({
        where: { code: nextCode, id: { not: id } },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Attribute code already exists' },
          { status: 400 },
        );
      }
    }

    const values = body.values ? normalizeValues(body.values) : undefined;
    if (values) {
      const seenSlugs = new Set<string>();
      for (const value of values) {
        const key = value.slug.toLowerCase();
        if (seenSlugs.has(key)) {
          return NextResponse.json(
            { success: false, error: `Duplicate value slug: ${value.slug}` },
            { status: 400 },
          );
        }
        seenSlugs.add(key);
      }
    }

    if (values) {
      await prisma.productAttributeValue.deleteMany({
        where: { attributeId: id },
      });
    }

    const attribute = await prisma.productAttribute.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(nextCode !== undefined ? { code: nextCode } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.isRequired !== undefined ? { isRequired: body.isRequired } : {}),
        ...(body.isFilterable !== undefined
          ? { isFilterable: body.isFilterable }
          : {}),
        ...(body.isVariantAxis !== undefined
          ? { isVariantAxis: body.isVariantAxis }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.displayOrder !== undefined
          ? { displayOrder: body.displayOrder }
          : {}),
        ...(values
          ? {
              values: {
                create: values,
              },
            }
          : {}),
      },
      include: {
        values: {
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { attribute },
    });
  } catch (error) {
    console.error('Admin update product attribute error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: message === 'Unauthorized' ? 401 : 500 },
    );
  }
}

// DELETE /api/admin/product-attributes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.productAttribute.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attribute not found' },
        { status: 404 },
      );
    }

    await prisma.productAttribute.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        message:
          existing._count.assignments > 0
            ? 'Deleted attribute and detached assigned products'
            : 'Deleted attribute',
      },
    });
  } catch (error) {
    console.error('Admin delete product attribute error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: message === 'Unauthorized' ? 401 : 500 },
    );
  }
}
