import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all products (public endpoint - no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

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
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          images: { orderBy: { displayOrder: 'asc' } },
        },
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
