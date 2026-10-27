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
  incentiveFailureMessage,
  normalizeIncentiveCode,
  type IncentiveReadModel,
} from '@/lib/incentives/policy';
import { enforceIpRateLimit } from '@/lib/rate-limit';
import {
  getDeliverySettings as fetchDeliverySettings,
  type DeliverySettings,
} from '@/lib/delivery-settings';

type PreviewPayload = {
  incentiveCode?: string;
  incentiveCodes?: string[];
  deliveryMethod?: 'pickup' | 'delivery';
  items?: Array<{
    productId?: string;
    quantity?: number;
    variantId?: string;
  }>;
};

type PreviewVariant = {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
};

type PreviewRouteDeps = {
  getCurrentUser: (
    request: NextRequest,
  ) => Promise<{ id: string; memberLevel?: string | null } | null>;
  findProducts: (
    productIds: string[],
  ) => Promise<Array<{ id: string; name: string; price: number; categoryIds: string[] }>>;
  findVariants: (variantIds: string[]) => Promise<PreviewVariant[]>;
  findIncentiveByCode: (code: string) => Promise<IncentiveReadModel | null>;
  countUserCommittedIncentiveUsage: (
    couponId: string,
    userId: string,
  ) => Promise<number>;
  getMembershipConfig: () => Promise<MembershipRulesConfig>;
  getDeliverySettings: () => Promise<DeliverySettings>;
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
  findVariants: (variantIds) =>
    prisma.productVariant
      .findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          productId: true,
          name: true,
          price: true,
          stock: true,
        },
      })
      .then((variants) =>
        variants.map((variant) => ({
          id: variant.id,
          productId: variant.productId,
          name: variant.name,
          price: Number(variant.price),
          stock: variant.stock,
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
  getDeliverySettings: fetchDeliverySettings,
  now: () => new Date(),
};

function resolveNormalizedIncentiveCodes(args: {
  incentiveCodeInput: unknown;
  incentiveCodesInput: unknown;
}): { codes: string[]; error?: string } {
  const normalizedSingle = normalizeIncentiveCode(args.incentiveCodeInput);
  if (normalizedSingle === '') {
    return {
      codes: [],
      error: 'Mã ưu đãi không hợp lệ. Vui lòng nhập mã.',
    };
  }

  const codes: string[] = [];
  if (Array.isArray(args.incentiveCodesInput)) {
    for (const value of args.incentiveCodesInput) {
      const normalized = normalizeIncentiveCode(value);
      if (normalized === '') {
        return {
          codes: [],
          error: 'Có mã ưu đãi không hợp lệ.',
        };
      }
      if (normalized) {
        codes.push(normalized);
      }
    }
  }

  if (normalizedSingle) {
    codes.push(normalizedSingle);
  }

  const uniqueCodes = Array.from(new Set(codes));
  if (uniqueCodes.length > 5) {
    return {
      codes: [],
      error: 'Tối đa 5 mã ưu đãi cho mỗi đơn.',
    };
  }

  return { codes: uniqueCodes };
}

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
        error: 'Thiếu trường bắt buộc',
      },
    };
  }

  const payload = body as PreviewPayload;
  if (!payload.items?.length) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Thiếu trường bắt buộc',
      },
    };
  }

  for (const item of payload.items) {
    if (!item.productId || !item.quantity || item.quantity < 1 || item.quantity > 100) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Dữ liệu món không hợp lệ',
        },
      };
    }
  }

  if (
    payload.deliveryMethod !== undefined &&
    payload.deliveryMethod !== 'pickup' &&
    payload.deliveryMethod !== 'delivery'
  ) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Phương thức nhận hàng không hợp lệ',
      },
    };
  }

  const normalizedIncentiveCodesResult = resolveNormalizedIncentiveCodes({
    incentiveCodeInput: payload.incentiveCode,
    incentiveCodesInput: payload.incentiveCodes,
  });
  if (normalizedIncentiveCodesResult.error) {
    return {
      status: 400,
      body: {
        success: false,
        error: normalizedIncentiveCodesResult.error,
      },
    };
  }
  const normalizedIncentiveCodes = normalizedIncentiveCodesResult.codes;

  const products = await deps.findProducts(payload.items.map((item) => item.productId!));
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of payload.items) {
    const product = productMap.get(item.productId!);
    if (!product) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Sản phẩm "${item.productId}" hiện không khả dụng`,
        },
      };
    }
  }

  // Mirror the create-order route's variant pricing: requests without any
  // variantId never hit the variants dep and keep the exact legacy base-price
  // behavior. Preview is advisory — a missing or foreign variant falls back to
  // the base product price instead of 400, since the create route remains the
  // enforcement point for variant ownership.
  const variantIds = Array.from(
    new Set(
      payload.items
        .map((item) => item.variantId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const variantMap = new Map<string, PreviewVariant>();
  if (variantIds.length > 0) {
    const variants = await deps.findVariants(variantIds);
    for (const variant of variants) {
      variantMap.set(variant.id, variant);
    }
  }

  const cartItems = payload.items.map((item) => {
    const product = productMap.get(item.productId!)!;
    const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
    const ownedVariant =
      variant && variant.productId === item.productId ? variant : undefined;
    // Same line identity as the create route: variant price wins when the
    // variant belongs to this product, and the item is named
    // `${product.name} - ${variant.name}`. The preview response does not
    // expose per-item lines today, so the name only documents the pricing
    // identity alongside `price`.
    const name = ownedVariant
      ? `${product.name} - ${ownedVariant.name}`
      : product.name;
    const price = ownedVariant ? ownedVariant.price : product.price;
    return {
      productId: item.productId!,
      lineSubtotal: price * item.quantity!,
      categoryIds: product.categoryIds,
      name,
      price,
    };
  });
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineSubtotal, 0);

  // Same rule as the create-order route: only delivery orders pay the fee.
  // Absent deliveryMethod keeps the legacy fee-less response so existing
  // mobile clients parse the exact same fields as before.
  const isDelivery = payload.deliveryMethod === 'delivery';
  let deliveryFee = 0;
  if (isDelivery) {
    const deliverySettings = await deps.getDeliverySettings();
    deliveryFee =
      deliverySettings.freeDeliveryThreshold > 0 &&
      subtotal >= deliverySettings.freeDeliveryThreshold
        ? 0
        : deliverySettings.deliveryFee;
  }

  const user = request ? await deps.getCurrentUser(request) : null;
  const membershipConfig = await deps.getMembershipConfig();
  const membershipDiscountPercent = user
    ? getDiscountPercentForLevel(membershipConfig, user.memberLevel)
    : 0;
  const membershipDiscount = Math.round(subtotal * (membershipDiscountPercent / 100));

  if (normalizedIncentiveCodes.length === 0) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          subtotal,
          membershipDiscount,
          couponDiscount: 0,
          totalDiscount: membershipDiscount,
          total: subtotal - membershipDiscount + deliveryFee,
          // JSON.stringify drops undefined keys, so a request without
          // deliveryMethod produces the exact legacy response shape.
          deliveryFee:
            payload.deliveryMethod !== undefined ? deliveryFee : undefined,
          appliedIncentive: null,
          appliedIncentives: [],
        },
      },
    };
  }

  let couponDiscount = 0;
  const appliedIncentives: Array<{
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    discount: number;
  }> = [];

  for (const code of normalizedIncentiveCodes) {
    const incentive = await deps.findIncentiveByCode(code);
    if (!incentive) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Incentive code "${code}" is invalid or inactive.`,
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
      ignoreMembershipConflict: true,
    });

    if (!evaluation.ok) {
      return {
        status: 400,
        body: {
          success: false,
          error: incentiveFailureMessage(incentive, evaluation),
        },
      };
    }

    const remainingDiscountBudget = Math.max(
      subtotal - membershipDiscount - couponDiscount,
      0,
    );
    const appliedDiscount = Math.min(evaluation.discount, remainingDiscountBudget);
    if (appliedDiscount <= 0) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Incentive code "${code}" does not provide additional discount.`,
        },
      };
    }

    couponDiscount += appliedDiscount;
    appliedIncentives.push({
      code,
      type: incentive.type,
      discount: appliedDiscount,
    });
  }

  const totalDiscount = membershipDiscount + couponDiscount;
  // Fee is added after discounts, matching the create-order route's
  // `total = subtotal + deliveryFee - finalDiscount`.
  const total = subtotal - totalDiscount + deliveryFee;
  if (total <= 0) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Tổng tiền đơn hàng không hợp lệ',
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
        totalDiscount,
        total,
        deliveryFee:
          payload.deliveryMethod !== undefined ? deliveryFee : undefined,
        appliedIncentive: appliedIncentives[0] ?? null,
        appliedIncentives,
      },
    },
  };
}

// Anonymous and accepts five codes per call, so pace it per IP.
const PREVIEW_RATE_LIMIT = { maxRequests: 30, windowMs: 10 * 60 * 1000 };

export async function POST(request: NextRequest) {
  const rateLimit = enforceIpRateLimit(request, 'incentives-preview', PREVIEW_RATE_LIMIT);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { success: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } },
    );
  }

  try {
    const body = await request.json();
    const result = await handlePreviewIncentiveRequest(body, defaultDeps, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Preview incentive error:', error);
    return NextResponse.json(
      { success: false, error: 'Không xem trước được mã ưu đãi' },
      { status: 500 },
    );
  }
}
