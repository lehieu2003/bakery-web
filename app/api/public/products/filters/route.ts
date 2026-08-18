import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

async function collectDescendantIds(parentId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId, isActive: true },
    select: { id: true },
  });

  const childIds = children.map((child) => child.id);
  const nested = await Promise.all(childIds.map(collectDescendantIds));

  return [...childIds, ...nested.flat()];
}

// GET /api/public/products/filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (categoryId) {
      const descendantIds = await collectDescendantIds(categoryId);
      where.categories = {
        some: { categoryId: { in: [categoryId, ...descendantIds] } },
      };
    }

    const [range, attributes] = await Promise.all([
      prisma.product.aggregate({
        where,
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.productAttribute.findMany({
        where: {
          isActive: true,
          isFilterable: true,
          assignments: {
            some: {
              product: where,
              valueId: { not: null },
            },
          },
        },
        include: {
          values: {
            where: { isActive: true },
            orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
            include: {
              assignments: {
                where: {
                  product: where,
                },
                select: {
                  productId: true,
                },
              },
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const filters = attributes
      .map((attribute) => ({
        ...attribute,
        values: attribute.values
          .map((value) => ({
            ...value,
            productCount: new Set(value.assignments.map((assignment) => assignment.productId)).size,
          }))
          .filter((value) => value.productCount > 0)
          .map((value) => ({
            id: value.id,
            value: value.value,
            attributeId: value.attributeId,
            productCount: value.productCount,
          })),
      }))
      .filter((attribute) => attribute.values.length > 0);

    return NextResponse.json({
      success: true,
      data: {
        filters,
        priceRange: {
          min: Number(range._min.price ?? 0),
          max: Number(range._max.price ?? 0),
        },
      },
    });
  } catch (error) {
    console.error('Get public product filters error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product filters' },
      { status: 500 },
    );
  }
}
