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

type RelatedProductsDeps = {
  findCurrentProduct: (idOrSlug: string) => Promise<{
    id: string;
    categories: Array<{ categoryId: string }>;
  } | null>;
  findRelatedProducts: (args: {
    excludeId: string;
    categoryIds: string[];
    limit: number;
  }) => Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      price: unknown;
      comparePrice: unknown;
      shortDescription: string | null;
      stock: number;
      isFeatured: boolean;
      createdAt: Date;
      images: Array<{
        id: string;
        url: string;
        altText: string | null;
        displayOrder: number;
        isPrimary: boolean;
      }>;
      categories: Array<{
        category: { id: string; name: string; slug: string };
      }>;
    }>
  >;
};

const defaultDeps: RelatedProductsDeps = {
  findCurrentProduct: (idOrSlug) =>
    prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      select: {
        id: true,
        categories: { select: { categoryId: true } },
      },
    }),
  findRelatedProducts: ({ excludeId, categoryIds, limit }) =>
    prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: excludeId },
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      select: productSelect,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
};

export async function handleGetRelatedProductsRequest(
  idOrSlug: string,
  deps: RelatedProductsDeps = defaultDeps,
) {
  const current = await deps.findCurrentProduct(idOrSlug);

  if (!current) {
    return {
      status: 404,
      body: { success: false, error: 'Không tìm thấy sản phẩm' },
    };
  }

  const categoryIds = current.categories.map((c) => c.categoryId);
  const excludeId = current.id;
  const results =
    categoryIds.length > 0
      ? await deps.findRelatedProducts({ excludeId, categoryIds, limit: LIMIT })
      : [];

  const data = results.map((p) => ({
    ...p,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return { status: 200, body: { success: true, data } };
}

// GET /api/public/products/[id]/related
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await handleGetRelatedProductsRequest(id);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Related products error:', error);
    return NextResponse.json(
      { success: false, error: 'Không tải được sản phẩm liên quan' },
      { status: 500 },
    );
  }
}
