import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LIMIT = 4;

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  shortDescription: true,
  stock: true,
  isFeatured: true,
  createdAt: true,
  images: {
    orderBy: { displayOrder: 'asc' as const },
    select: {
      id: true,
      url: true,
      altText: true,
      displayOrder: true,
      isPrimary: true,
    },
  },
  categories: {
    select: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
};

// GET /api/public/products/[idOrSlug]/related
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    const { idOrSlug } = await params;

    // Find current product and its category IDs
    const current = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      select: {
        id: true,
        categories: { select: { categoryId: true } },
      },
    });

    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      );
    }

    const categoryIds = current.categories.map((c) => c.categoryId);
    const excludeId = current.id;

    // 1. Fetch products that share at least one category
    const sameCategoryProducts = categoryIds.length > 0
      ? await prisma.product.findMany({
          where: {
            isActive: true,
            id: { not: excludeId },
            categories: { some: { categoryId: { in: categoryIds } } },
          },
          select: productSelect,
          take: LIMIT,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    let results = sameCategoryProducts;

    // 2. Fill remaining slots with featured products
    if (results.length < LIMIT) {
      const existingIds = results.map((p) => p.id);
      const featured = await prisma.product.findMany({
        where: {
          isActive: true,
          isFeatured: true,
          id: { notIn: [excludeId, ...existingIds] },
        },
        select: productSelect,
        take: LIMIT - results.length,
        orderBy: { createdAt: 'desc' },
      });
      results = [...results, ...featured];
    }

    // 3. Fill remaining slots with newest products
    if (results.length < LIMIT) {
      const existingIds = results.map((p) => p.id);
      const newest = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { notIn: [excludeId, ...existingIds] },
        },
        select: productSelect,
        take: LIMIT - results.length,
        orderBy: { createdAt: 'desc' },
      });
      results = [...results, ...newest];
    }

    // Serialize Decimal fields to numbers
    const data = results.map((p) => ({
      ...p,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Related products error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch related products' },
      { status: 500 },
    );
  }
}
