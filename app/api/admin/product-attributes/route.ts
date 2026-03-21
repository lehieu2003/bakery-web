import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { CreateProductAttributeRequest, ProductAttributeValueInput } from '@/types/api.types';
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

// GET /api/admin/product-attributes
export async function GET() {
  try {
    await requireAdmin();

    const attributes = await prisma.productAttribute.findMany({
      include: {
        values: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: { attributes },
    });
  } catch (error) {
    console.error('Admin get product attributes error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: message === 'Unauthorized' ? 401 : 500 },
    );
  }
}

// POST /api/admin/product-attributes
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as CreateProductAttributeRequest;
    const name = body.name?.trim();
    const slug = slugifyProductAttribute(body.slug?.trim() || body.name?.trim() || '');
    const code = body.code?.trim();

    if (!name || !slug || !code || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const [existingSlug, existingCode] = await Promise.all([
      prisma.productAttribute.findUnique({ where: { slug } }),
      prisma.productAttribute.findUnique({ where: { code } }),
    ]);

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: 'Attribute slug already exists' },
        { status: 400 },
      );
    }

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: 'Attribute code already exists' },
        { status: 400 },
      );
    }

    const values = normalizeValues(body.values);
    const duplicateValueSlug = new Set<string>();
    for (const value of values) {
      const key = value.slug.toLowerCase();
      if (duplicateValueSlug.has(key)) {
        return NextResponse.json(
          { success: false, error: `Duplicate value slug: ${value.slug}` },
          { status: 400 },
        );
      }
      duplicateValueSlug.add(key);
    }

    const attribute = await prisma.productAttribute.create({
      data: {
        name,
        slug,
        code,
        type: body.type,
        description: body.description?.trim() || null,
        isRequired: body.isRequired ?? false,
        isFilterable: body.isFilterable ?? true,
        isVariantAxis: body.isVariantAxis ?? false,
        isActive: body.isActive ?? true,
        displayOrder: body.displayOrder ?? 0,
        ...(values.length > 0 ? { values: { create: values } } : {}),
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
    console.error('Admin create product attribute error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Đã có lỗi xảy ra' },
      { status: message === 'Unauthorized' ? 401 : 500 },
    );
  }
}
