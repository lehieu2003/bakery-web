import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

type BestSellersDeps = {
  groupTopSold: (limit: number) => Promise<
    Array<{ productId: string; _sum: { quantity: number | null } }>
  >;
  findFallbackProducts: (limit: number) => Promise<unknown[]>;
  findRankedProducts: (productIds: string[]) => Promise<unknown[]>;
};

const defaultDeps: BestSellersDeps = {
  groupTopSold: (limit) =>
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        order: {
          status: { in: ['COMPLETED', 'READY', 'CONFIRMED', 'PROCESSING'] },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    }),
  findFallbackProducts: (limit) =>
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        images: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  findRankedProducts: (productIds) =>
    prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        images: { orderBy: { displayOrder: 'asc' } },
      },
    }),
};

export async function handleGetBestSellersRequest(
  requestUrl: string,
  deps: BestSellersDeps = defaultDeps,
) {
  const { searchParams } = new URL(requestUrl);
  const limit = normalizePositiveInt(searchParams.get('limit'), 10, 50);

  const topSold = await deps.groupTopSold(limit);
  if (topSold.length === 0) {
    const products = await deps.findFallbackProducts(limit);
    return {
      status: 200,
      body: {
        success: true,
        data: { products: products.map((p) => ({ ...p, totalSold: 0 })) },
      },
    };
  }

  const productIds = topSold.map((item) => item.productId);
  const soldMap = new Map(
    topSold.map((item) => [item.productId, item._sum.quantity ?? 0]),
  );
  const products = await deps.findRankedProducts(productIds);
  const sorted = products
    .map((p) => ({
      ...(p as Record<string, unknown>),
      totalSold: soldMap.get((p as { id: string }).id) ?? 0,
    }))
    .sort((a, b) => b.totalSold - a.totalSold);

  return { status: 200, body: { success: true, data: { products: sorted } } };
}

// GET /api/public/products/best-sellers
// Returns top-selling products ranked by total quantity sold from completed orders
export async function GET(request: NextRequest) {
  try {
    const result = await handleGetBestSellersRequest(request.url);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get best-sellers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch best sellers' },
      { status: 500 },
    );
  }
}
