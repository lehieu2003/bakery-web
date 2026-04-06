import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';
import {
  getDiscountPercentForLevel,
  getMembershipRulesConfig,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';
import {
  evaluateIncentiveEligibility,
  normalizeIncentiveCode,
  type IncentiveReadModel,
} from '@/lib/incentives/policy';

type PreviewPayload = {
  incentiveCode?: string;
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

type PreviewRouteDeps = {
  getCurrentUser: (
    request: NextRequest,
  ) => Promise<{ id: string; memberLevel?: string | null } | null>;
  findProducts: (
    productIds: string[],
  ) => Promise<Array<{ id: string; name: string; price: number; categoryIds: string[] }>>;
  findIncentiveByCode: (code: string) => Promise<IncentiveReadModel | null>;
  countUserCommittedIncentiveUsage: (
    couponId: string,
    userId: string,
  ) => Promise<number>;
  getMembershipConfig: () => Promise<MembershipRulesConfig>;
  now: () => Date;
};

const defaultDeps: PreviewRouteDeps = {
  getCurrentUser: getCurrentUserFromRequest,
  findProducts: (productIds) =>
    prisma.product
      .findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
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
          name: product.name,
          price: Number(product.price),
          categoryIds: product.categories.map((category) => category.categoryId),
        })),
      ),
  findIncentiveByCode: async (code) => {
    const coupon = await prisma.coupon.findUnique({
      where: { code },
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
    });

    if (!coupon) return null;

    return {
      ...coupon,
      sourceType: coupon.sourceType as 'PUBLIC' | 'TARGETED' | 'TRIGGERED',
      type: coupon.type as 'PERCENTAGE' | 'FIXED',
      assignments: coupon.assignments.map((assignment) => ({
        userId: assignment.userId,
        targetSegment: assignment.targetSegment,
        isActive: assignment.isActive,
        expiresAt: assignment.expiresAt,
      })),
    };
  },
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

export async function handlePreviewIncentiveRequest(
  body: unknown,
  deps: PreviewRouteDeps = defaultDeps,
  request?: NextRequest,
) {
  if (!body || typeof body !== 'object') {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Missing required fields',
      },
    };
  }

  const payload = body as PreviewPayload;
  if (!payload.items?.length) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Missing required fields',
      },
    };
  }

  for (const item of payload.items) {
    if (!item.productId || !item.quantity || item.quantity < 1 || item.quantity > 100) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Invalid item data',
        },
      };
    }
  }

  const normalizedIncentiveCode = normalizeIncentiveCode(payload.incentiveCode);
  if (normalizedIncentiveCode === '') {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Incentive code is invalid. Please enter a non-empty code.',
      },
    };
  }

  const products = await deps.findProducts(payload.items.map((item) => item.productId!));
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of payload.items) {
    const product = productMap.get(item.productId!);
    if (!product) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Product "${item.productId}" is not available`,
        },
      };
    }
  }

  const cartItems = payload.items.map((item) => {
    const product = productMap.get(item.productId!)!;
    return {
      productId: item.productId!,
      lineSubtotal: product.price * item.quantity!,
      categoryIds: product.categoryIds,
    };
  });
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineSubtotal, 0);

  const user = request ? await deps.getCurrentUser(request) : null;
  const membershipConfig = await deps.getMembershipConfig();
  const membershipDiscountPercent = user
    ? getDiscountPercentForLevel(membershipConfig, user.memberLevel)
    : 0;
  const membershipDiscount = Math.round(subtotal * (membershipDiscountPercent / 100));

  if (!normalizedIncentiveCode) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          subtotal,
          membershipDiscount,
          couponDiscount: 0,
          totalDiscount: membershipDiscount,
          total: subtotal - membershipDiscount,
          appliedIncentive: null,
        },
      },
    };
  }

  const incentive = await deps.findIncentiveByCode(normalizedIncentiveCode);
  if (!incentive) {
    return {
      status: 400,
      body: {
        success: false,
        error: `Incentive code "${normalizedIncentiveCode}" is invalid or inactive.`,
      },
    };
  }

  const userCommittedUsageCount = user?.id
    ? await deps.countUserCommittedIncentiveUsage(incentive.id, user.id)
    : 0;
  const evaluation = evaluateIncentiveEligibility({
    incentive,
    now: deps.now(),
    user: {
      id: user?.id ?? null,
      memberLevel: user?.memberLevel ?? null,
    },
    cartSubtotal: subtotal,
    cartItems,
    membershipDiscount,
    userCommittedUsageCount,
  });

  if (!evaluation.ok) {
    return {
      status: 400,
      body: {
        success: false,
        error: evaluation.message,
      },
    };
  }

  const couponDiscount = evaluation.discount;
  const total = subtotal - couponDiscount;
  if (total <= 0) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Invalid order total',
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        subtotal,
        membershipDiscount,
        couponDiscount,
        totalDiscount: couponDiscount,
        total,
        appliedIncentive: {
          code: incentive.code,
          type: incentive.type,
          discount: couponDiscount,
        },
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handlePreviewIncentiveRequest(body, defaultDeps, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Preview incentive error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview incentive' },
      { status: 500 },
    );
  }
}
