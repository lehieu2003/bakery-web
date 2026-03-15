import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  buildProductAttributeWhere,
  parseAttributeFilters,
} from '@/lib/product-attributes';

const productInclude: Prisma.ProductInclude = {
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
  images: { orderBy: { displayOrder: 'asc' } },
  attributeAssignments: {
    include: {
      attribute: true,
      value: true,
    },
    orderBy: [{ attribute: { displayOrder: 'asc' } }, { createdAt: 'asc' }],
  },
};

// GET: List all products (public endpoint - no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock') === 'true';
    const attributeFilters = parseAttributeFilters(
      searchParams.getAll('attribute'),
    );

    const skip = (page - 1) * limit;

    const andConditions: Record<string, unknown>[] = [];
    const where: Record<string, unknown> = { isActive: true };
    if (categoryId) {
      // Recursively collect all descendant category IDs so products in
      // sub-categories (grandchildren etc.) are included in the results.
      const collectDescendantIds = async (parentId: string): Promise<string[]> => {
        const children = await prisma.category.findMany({
          where: { parentId, isActive: true },
          select: { id: true },
        });
        const childIds = children.map((c) => c.id);
        const deeper = await Promise.all(childIds.map(collectDescendantIds));
        return [...childIds, ...deeper.flat()];
      };

      const descendantIds = await collectDescendantIds(categoryId);
      const categoryIds = [categoryId, ...descendantIds];
      where.categories = { some: { categoryId: { in: categoryIds } } };
    }
    if (search) {
      andConditions.push({
        OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      };
    }
    if (inStock) {
      andConditions.push({
        OR: [
        { trackStock: false },
        { stock: { gt: 0 } },
        ],
      });
    }
    if (attributeFilters.length > 0) {
      andConditions.push(...buildProductAttributeWhere(attributeFilters));
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get public products error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 },
    );
  }
}
