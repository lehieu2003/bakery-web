import { NextRequest, NextResponse } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';
import { handleGetBestSellersRequest } from '@/app/api/public/products/best-sellers/route';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

const COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  'COMPLETED',
];

type RecommendationSource = 'behavioral' | 'hybrid' | 'fallback';
type RecommendationReason =
  | 'no-user'
  | 'no-signal'
  | 'insufficient-signal'
  | 'behavior-match';

type BehaviorSignal = {
  productId: string;
  orderQty: number;
  lastOrderedAt: Date | null;
  lastWishlistedAt: Date | null;
};

type RecommendationProduct = {
  id: string;
  [key: string]: unknown;
};

type PersonalizedProductsDeps = {
  getBehaviorSignals: (userId: string) => Promise<BehaviorSignal[]>;
  findBehavioralProducts: (productIds: string[]) => Promise<RecommendationProduct[]>;
  getFallbackProducts: (limit: number) => Promise<RecommendationProduct[]>;
};

function normalizePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

function toTimestamp(date: Date | null): number {
  if (!date) return 0;
  return date.getTime();
}

function compareSignals(a: BehaviorSignal, b: BehaviorSignal) {
  if (a.orderQty !== b.orderQty) return b.orderQty - a.orderQty;

  const aHasWishlist = a.lastWishlistedAt ? 1 : 0;
  const bHasWishlist = b.lastWishlistedAt ? 1 : 0;
  if (aHasWishlist !== bHasWishlist) return bHasWishlist - aHasWishlist;

  const latestA = Math.max(
    toTimestamp(a.lastOrderedAt),
    toTimestamp(a.lastWishlistedAt),
  );
  const latestB = Math.max(
    toTimestamp(b.lastOrderedAt),
    toTimestamp(b.lastWishlistedAt),
  );

  if (latestA !== latestB) return latestB - latestA;
  return a.productId.localeCompare(b.productId);
}

function mergeBehaviorSignals(args: {
  orders: Array<{
    createdAt: Date;
    orderItems: Array<{ productId: string; quantity: number }>;
  }>;
  wishlist: Array<{ productId: string; createdAt: Date }>;
}) {
  const signalByProduct = new Map<string, BehaviorSignal>();

  for (const order of args.orders) {
    for (const item of order.orderItems) {
      const current = signalByProduct.get(item.productId) ?? {
        productId: item.productId,
        orderQty: 0,
        lastOrderedAt: null,
        lastWishlistedAt: null,
      };

      current.orderQty += item.quantity;
      if (!current.lastOrderedAt || order.createdAt > current.lastOrderedAt) {
        current.lastOrderedAt = order.createdAt;
      }

      signalByProduct.set(item.productId, current);
    }
  }

  for (const row of args.wishlist) {
    const current = signalByProduct.get(row.productId) ?? {
      productId: row.productId,
      orderQty: 0,
      lastOrderedAt: null,
      lastWishlistedAt: null,
    };

    if (!current.lastWishlistedAt || row.createdAt > current.lastWishlistedAt) {
      current.lastWishlistedAt = row.createdAt;
    }

    signalByProduct.set(row.productId, current);
  }

  return Array.from(signalByProduct.values());
}

const defaultDeps: PersonalizedProductsDeps = {
  getBehaviorSignals: async (userId) => {
    const [orders, wishlist] = await Promise.all([
      prisma.order.findMany({
        where: {
          userId,
          status: { in: COMPLETED_ORDER_STATUSES },
        },
        select: {
          createdAt: true,
          orderItems: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.wishlist.findMany({
        where: { userId },
        select: {
          productId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return mergeBehaviorSignals({ orders, wishlist });
  },
  findBehavioralProducts: async (productIds) => {
    if (productIds.length === 0) return [];

    return prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        images: { orderBy: { displayOrder: 'asc' } },
      },
    }) as unknown as RecommendationProduct[];
  },
  getFallbackProducts: async (limit) => {
    const result = await handleGetBestSellersRequest(
      `http://localhost/api/public/products/best-sellers?limit=${limit}`,
    );

    const body = result.body as {
      success: boolean;
      data?: { products?: RecommendationProduct[] };
    };

    return body.data?.products ?? [];
  },
};

function buildResponse(args: {
  products: RecommendationProduct[];
  source: RecommendationSource;
  reason: RecommendationReason;
}) {
  return {
    status: 200,
    body: {
      success: true,
      data: {
        products: args.products,
        source: args.source,
        reason: args.reason,
      },
    },
  };
}

export async function handleGetPersonalizedProductsRequest(
  requestUrl: string,
  options: { userId: string | null },
  deps: PersonalizedProductsDeps = defaultDeps,
) {
  const { searchParams } = new URL(requestUrl);
  const limit = normalizePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);

  const fallbackLimit = Math.min(limit * 3, MAX_LIMIT);

  if (!options.userId) {
    const fallback = await deps.getFallbackProducts(fallbackLimit);
    return buildResponse({
      products: fallback.slice(0, limit),
      source: 'fallback',
      reason: 'no-user',
    });
  }

  const behaviorSignals = await deps.getBehaviorSignals(options.userId);
  if (behaviorSignals.length === 0) {
    const fallback = await deps.getFallbackProducts(fallbackLimit);
    return buildResponse({
      products: fallback.slice(0, limit),
      source: 'fallback',
      reason: 'no-signal',
    });
  }

  const rankedSignalIds = behaviorSignals.sort(compareSignals).map((signal) => signal.productId);
  const behaviorProducts = await deps.findBehavioralProducts(rankedSignalIds);
  const behavioralMap = new Map(behaviorProducts.map((product) => [product.id, product]));
  const rankedBehaviorProducts = rankedSignalIds
    .map((productId) => behavioralMap.get(productId))
    .filter((product): product is RecommendationProduct => !!product);

  if (rankedBehaviorProducts.length >= limit) {
    return buildResponse({
      products: rankedBehaviorProducts.slice(0, limit),
      source: 'behavioral',
      reason: 'behavior-match',
    });
  }

  const fallback = await deps.getFallbackProducts(fallbackLimit);
  const existingIds = new Set(rankedBehaviorProducts.map((product) => product.id));
  const fallbackFill = fallback.filter((product) => !existingIds.has(product.id));
  const mergedProducts = [...rankedBehaviorProducts, ...fallbackFill].slice(0, limit);

  if (rankedBehaviorProducts.length > 0) {
    return buildResponse({
      products: mergedProducts,
      source: 'hybrid',
      reason: 'insufficient-signal',
    });
  }

  return buildResponse({
    products: mergedProducts,
    source: 'fallback',
    reason: 'insufficient-signal',
  });
}

// GET /api/public/products/personalized
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    const result = await handleGetPersonalizedProductsRequest(
      request.url,
      { userId: user?.id ?? null },
      defaultDeps,
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get personalized products error:', error);
    return NextResponse.json(
      { success: false, error: 'Không tải được sản phẩm gợi ý' },
      { status: 500 },
    );
  }
}

