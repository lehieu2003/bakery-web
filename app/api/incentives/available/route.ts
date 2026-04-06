import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';
import {
  getDiscountPercentForLevel,
  getMembershipRulesConfig,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';
import {
  asNumber,
  evaluateIncentiveEligibility,
  type IncentiveReadModel,
} from '@/lib/incentives/policy';

type ProductContextReadModel = {
  id: string;
  price: number;
  categoryIds: string[];
};

type CartRequestItem = {
  productId: string;
  quantity: number;
};

type IncentivesAvailableRouteDeps = {
  getCurrentUser: (
    request: NextRequest,
  ) => Promise<{ id: string; memberLevel?: string | null } | null>;
  listIncentives: () => Promise<IncentiveReadModel[]>;
  findProductsByIds: (productIds: string[]) => Promise<ProductContextReadModel[]>;
  countUserCommittedIncentiveUsage: (
    couponId: string,
    userId: string,
  ) => Promise<number>;
  getMembershipConfig: () => Promise<MembershipRulesConfig>;
  now: () => Date;
};

const defaultDeps: IncentivesAvailableRouteDeps = {
  getCurrentUser: getCurrentUserFromRequest,
  listIncentives: async () => {
    const coupons = await prisma.coupon.findMany({
      select: {
        id: true,
        code: true,
        sourceType: true,
        type: true,
        value: true,
        minOrder: true,
        maxDiscount: true,
        usageLimit: true,
        perUserLimit: true,
        scopeProductIds: true,
        scopeCategoryIds: true,
        startAt: true,
        endAt: true,
        isActive: true,
        assignments: {
          where: { isActive: true },
          select: {
            userId: true,
            targetSegment: true,
            isActive: true,
            expiresAt: true,
          },
        },
      },
      orderBy: [{ endAt: 'asc' }, { code: 'asc' }],
    });

    return coupons.map((coupon) => ({
      ...coupon,
      sourceType: coupon.sourceType as 'PUBLIC' | 'TARGETED' | 'TRIGGERED',
      type: coupon.type as 'PERCENTAGE' | 'FIXED',
      assignments: coupon.assignments.map((assignment) => ({
        userId: assignment.userId,
        targetSegment: assignment.targetSegment,
        isActive: assignment.isActive,
        expiresAt: assignment.expiresAt,
      })),
    }));
  },
  findProductsByIds: (productIds) =>
    prisma.product
      .findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          price: true,
          categories: {
            select: {
              categoryId: true,
            },
          },
        },
      })
      .then((products) =>
        products.map((product) => ({
          id: product.id,
          price: Number(product.price),
          categoryIds: product.categories.map((category) => category.categoryId),
        })),
      ),
  countUserCommittedIncentiveUsage: (couponId, userId) =>
    prisma.couponRedemption.count({
      where: {
        couponId,
        userId,
        state: { in: ['RESERVED', 'COMMITTED'] },
      },
    }),
  getMembershipConfig: getMembershipRulesConfig,
  now: () => new Date(),
};

function parseSubtotal(request: NextRequest): { subtotal: number | null; error?: string } {
  const searchParams = (
    request as unknown as { nextUrl?: { searchParams?: URLSearchParams } }
  ).nextUrl?.searchParams;
  const raw = searchParams?.get?.('subtotal') ?? null;

  if (raw === null || raw.trim() === '') {
    return { subtotal: null };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { subtotal: null, error: 'Invalid subtotal query parameter' };
  }

  return { subtotal: parsed };
}

function parseProductIds(request: NextRequest): string[] {
  const searchParams = (
    request as unknown as { nextUrl?: { searchParams?: URLSearchParams } }
  ).nextUrl?.searchParams;

  const raw = searchParams?.get?.('productIds') ?? '';
  if (!raw.trim()) return [];

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function parseCartItems(request: NextRequest): {
  items: CartRequestItem[];
  error?: string;
} {
  const searchParams = (
    request as unknown as { nextUrl?: { searchParams?: URLSearchParams } }
  ).nextUrl?.searchParams;

  const raw = searchParams?.get?.('cart') ?? '';
  if (!raw.trim()) {
    return { items: [] };
  }

  const quantityByProductId = new Map<string, number>();
  for (const token of raw.split(',')) {
    const normalized = token.trim();
    if (!normalized) continue;

    const [productIdRaw, quantityRaw] = normalized.split(':');
    const productId = productIdRaw?.trim() ?? '';
    const quantity =
      quantityRaw === undefined || quantityRaw.trim() === ''
        ? 1
        : Number(quantityRaw.trim());

    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return { items: [], error: 'Invalid cart query parameter' };
    }

    const current = quantityByProductId.get(productId) ?? 0;
    quantityByProductId.set(productId, current + quantity);
  }

  return {
    items: Array.from(quantityByProductId.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  };
}

export async function handleGetAvailableIncentivesRequest(
  request: NextRequest,
  deps: IncentivesAvailableRouteDeps = defaultDeps,
) {
  const { subtotal, error } = parseSubtotal(request);
  if (error) {
    return {
      status: 400,
      body: {
        success: false,
        error,
      },
    };
  }
  const parsedCart = parseCartItems(request);
  if (parsedCart.error) {
    return {
      status: 400,
      body: {
        success: false,
        error: parsedCart.error,
      },
    };
  }

  const user = await deps.getCurrentUser(request);
  const fallbackProductIds = parseProductIds(request);
  const cartRequestItems =
    parsedCart.items.length > 0
      ? parsedCart.items
      : fallbackProductIds.map((productId) => ({
          productId,
          quantity: 1,
        }));
  const products =
    cartRequestItems.length > 0
      ? await deps.findProductsByIds(cartRequestItems.map((item) => item.productId))
      : [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const cartItems = cartRequestItems
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        lineSubtotal: product.price * item.quantity,
        categoryIds: product.categoryIds,
      };
    })
    .filter((item): item is { productId: string; lineSubtotal: number; categoryIds: string[] } =>
      item !== null,
    );

  const membershipDiscountPercent =
    user && subtotal !== null && subtotal > 0
      ? getDiscountPercentForLevel(
          await deps.getMembershipConfig(),
          user.memberLevel,
        )
      : 0;
  const membershipDiscount =
    subtotal !== null ? Math.round(subtotal * (membershipDiscountPercent / 100)) : 0;

  const now = deps.now();
  const cartSubtotalForEligibility = subtotal ?? Number.MAX_SAFE_INTEGER;
  const incentives = await deps.listIncentives();

  const data = [];
  for (const incentive of incentives) {
    const userCommittedUsageCount =
      user?.id
        ? await deps.countUserCommittedIncentiveUsage(incentive.id, user.id)
        : 0;
    const evaluation = evaluateIncentiveEligibility({
      incentive,
      now,
      user: {
        id: user?.id ?? null,
        memberLevel: user?.memberLevel ?? null,
      },
      cartSubtotal: cartSubtotalForEligibility,
      cartItems,
      membershipDiscount,
      userCommittedUsageCount,
    });

    if (!evaluation.ok) {
      continue;
    }

    data.push({
      code: incentive.code,
      type: incentive.type,
      value: Math.max(asNumber(incentive.value), 0),
      minOrder: (() => {
        const parsed = asNumber(incentive.minOrder);
        return parsed > 0 ? parsed : null;
      })(),
      maxDiscount: (() => {
        const parsed = asNumber(incentive.maxDiscount);
        return parsed > 0 ? parsed : null;
      })(),
      endAt: incentive.endAt.toISOString(),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        incentives: data,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleGetAvailableIncentivesRequest(request, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get available incentives error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available incentives' },
      { status: 500 },
    );
  }
}


