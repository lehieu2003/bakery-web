import type { MemberLevel } from '@prisma/client';

export type IncentiveAssignmentReadModel = {
  userId: string | null;
  targetSegment: MemberLevel | null;
  isActive: boolean;
  expiresAt: Date | null;
};

export type IncentiveReadModel = {
  id: string;
  code: string;
  sourceType: 'PUBLIC' | 'TARGETED' | 'TRIGGERED';
  type: 'PERCENTAGE' | 'FIXED';
  value: unknown;
  minOrder: unknown | null;
  maxDiscount: unknown | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  scopeProductIds: string[];
  scopeCategoryIds: string[];
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  assignments?: IncentiveAssignmentReadModel[];
};

export type IncentiveCartItem = {
  productId: string;
  lineSubtotal: number;
  categoryIds: string[];
};

export type IncentiveUserContext = {
  id: string | null;
  memberLevel?: MemberLevel | string | null;
};

type IneligibleResult = {
  ok: false;
  reasonCode:
    | 'INVALID_OR_INACTIVE'
    | 'NOT_ACTIVE_YET'
    | 'EXPIRED'
    | 'NOT_ASSIGNED'
    | 'USAGE_LIMIT_REACHED'
    | 'PER_USER_LIMIT_REACHED'
    | 'MIN_ORDER_NOT_REACHED'
    | 'OUT_OF_SCOPE'
    | 'NO_DISCOUNT'
    | 'MEMBERSHIP_CONFLICT';
  message: string;
};

type EligibleResult = {
  ok: true;
  discount: number;
  discountBase: number;
};

export type IncentiveEligibilityResult = EligibleResult | IneligibleResult;

export function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeIncentiveCode(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export function formatCurrencyVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

export function calculateIncentiveDiscount(
  incentive: Pick<IncentiveReadModel, 'type' | 'value' | 'maxDiscount'>,
  subtotal: number,
): number {
  const rawValue = Math.max(asNumber(incentive.value), 0);

  if (incentive.type === 'FIXED') {
    return Math.min(Math.round(rawValue), subtotal);
  }

  const percent = Math.min(Math.max(rawValue, 0), 100);
  const uncapped = Math.round(subtotal * (percent / 100));
  const maxDiscount = asNumber(incentive.maxDiscount);

  if (maxDiscount > 0) {
    return Math.min(uncapped, Math.round(maxDiscount), subtotal);
  }

  return Math.min(uncapped, subtotal);
}

export function isIncentiveVisibleToUser(
  incentive: Pick<IncentiveReadModel, 'sourceType' | 'assignments'>,
  user: IncentiveUserContext | null,
  now: Date,
): boolean {
  if (incentive.sourceType === 'PUBLIC') {
    return true;
  }

  if (!user?.id) {
    return false;
  }

  const assignments = incentive.assignments ?? [];
  return assignments.some((assignment) => {
    if (!assignment.isActive) return false;
    if (assignment.expiresAt && now > assignment.expiresAt) return false;
    if (assignment.userId && assignment.userId === user.id) return true;
    if (
      assignment.targetSegment &&
      user.memberLevel &&
      assignment.targetSegment === user.memberLevel
    ) {
      return true;
    }
    return false;
  });
}

function resolveScopedDiscountBase(
  incentive: Pick<IncentiveReadModel, 'scopeProductIds' | 'scopeCategoryIds'>,
  cartItems: IncentiveCartItem[],
  cartSubtotal: number,
): { base: number; hasScopeRestriction: boolean } {
  const scopeProductIds = incentive.scopeProductIds ?? [];
  const scopeCategoryIds = incentive.scopeCategoryIds ?? [];
  const hasScopeRestriction =
    scopeProductIds.length > 0 || scopeCategoryIds.length > 0;

  if (!hasScopeRestriction) {
    return { base: cartSubtotal, hasScopeRestriction: false };
  }

  const scopedSubtotal = cartItems.reduce((sum, item) => {
    const productMatch = scopeProductIds.includes(item.productId);
    const categoryMatch = item.categoryIds.some((categoryId) =>
      scopeCategoryIds.includes(categoryId),
    );
    return productMatch || categoryMatch ? sum + item.lineSubtotal : sum;
  }, 0);

  return { base: scopedSubtotal, hasScopeRestriction: true };
}

export function evaluateIncentiveEligibility(args: {
  incentive: IncentiveReadModel;
  now: Date;
  user: IncentiveUserContext | null;
  cartSubtotal: number;
  cartItems: IncentiveCartItem[];
  membershipDiscount: number;
  userCommittedUsageCount: number;
}): IncentiveEligibilityResult {
  const {
    incentive,
    now,
    user,
    cartSubtotal,
    cartItems,
    membershipDiscount,
    userCommittedUsageCount,
  } = args;
  const code = incentive.code;

  if (!incentive.isActive) {
    return {
      ok: false,
      reasonCode: 'INVALID_OR_INACTIVE',
      message: `Incentive code "${code}" is invalid or inactive.`,
    };
  }

  if (now < incentive.startAt) {
    return {
      ok: false,
      reasonCode: 'NOT_ACTIVE_YET',
      message: `Incentive code "${code}" is not active yet.`,
    };
  }

  if (now > incentive.endAt) {
    return {
      ok: false,
      reasonCode: 'EXPIRED',
      message: `Incentive code "${code}" has expired.`,
    };
  }

  if (!isIncentiveVisibleToUser(incentive, user, now)) {
    return {
      ok: false,
      reasonCode: 'NOT_ASSIGNED',
      message: `Incentive code "${code}" is not available for your account.`,
    };
  }

  if (incentive.usageLimit !== null && incentive.usageLimit <= 0) {
    return {
      ok: false,
      reasonCode: 'USAGE_LIMIT_REACHED',
      message: `Incentive code "${code}" has reached its usage limit.`,
    };
  }

  if (
    incentive.perUserLimit !== null &&
    incentive.perUserLimit > 0 &&
    userCommittedUsageCount >= incentive.perUserLimit
  ) {
    return {
      ok: false,
      reasonCode: 'PER_USER_LIMIT_REACHED',
      message: `Incentive code "${code}" has reached your personal usage limit.`,
    };
  }

  const minOrder = asNumber(incentive.minOrder);
  if (minOrder > 0 && cartSubtotal < minOrder) {
    return {
      ok: false,
      reasonCode: 'MIN_ORDER_NOT_REACHED',
      message: `Incentive code "${code}" requires a minimum order of ${formatCurrencyVnd(minOrder)}.`,
    };
  }

  const { base: discountBase, hasScopeRestriction } = resolveScopedDiscountBase(
    incentive,
    cartItems,
    cartSubtotal,
  );

  if (hasScopeRestriction && discountBase <= 0) {
    return {
      ok: false,
      reasonCode: 'OUT_OF_SCOPE',
      message: `Incentive code "${code}" does not apply to products in your cart.`,
    };
  }

  const discount = calculateIncentiveDiscount(incentive, discountBase);
  if (discount <= 0) {
    return {
      ok: false,
      reasonCode: 'NO_DISCOUNT',
      message: `Incentive code "${code}" does not provide a valid discount.`,
    };
  }

  if (membershipDiscount > 0 && discount <= membershipDiscount) {
    return {
      ok: false,
      reasonCode: 'MEMBERSHIP_CONFLICT',
      message: `Incentive code "${code}" conflicts with your current membership benefit. Remove the code or increase cart value.`,
    };
  }

  return {
    ok: true,
    discount,
    discountBase,
  };
}
