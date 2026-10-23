import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';
import { enforceIpRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createMoMoPayment } from '@/lib/payment/momo';
import { createVNPayPayment } from '@/lib/payment/vnpay';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';
import {
  getDiscountPercentForLevel,
  getMembershipRulesConfig,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';
import {
  getDeliverySettings as fetchDeliverySettings,
  type DeliverySettings,
} from '@/lib/delivery-settings';
import {
  asNumber,
  evaluateIncentiveEligibility,
  normalizeIncentiveCode,
  type IncentiveReadModel,
} from '@/lib/incentives/policy';
import {
  INCENTIVE_PER_USER_LIMIT_REACHED,
  INCENTIVE_USAGE_LIMIT_REACHED,
  applyCouponLifecycleForOrderStatus,
  reserveCouponRedemption,
} from '@/lib/incentives/redemption-lifecycle';
import {
  OUT_OF_STOCK,
  cancelOrderAndRestoreStock,
  decrementStock,
  sumQuantitiesBy,
  type StockDecrement,
} from '@/lib/orders/stock';
import { Prisma } from '@prisma/client';
import type { PaymentMethod } from '@/types/api.types';

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'COD',
  'BANK_TRANSFER',
  'MOMO',
  'VNPAY',
];
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
/** Client-generated per checkout attempt, e.g. a UUID. */
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

type CreateOrderPayload = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  paymentMethod?: PaymentMethod;
  deliveryMethod?: 'pickup' | 'delivery';
  incentiveCode?: string;
  incentiveCodes?: string[];
  pickupDate?: string;
  addressId?: string;
  items?: Array<{
    productId?: string;
    name?: string;
    price?: number;
    quantity?: number;
    variantId?: string;
    message?: string;
  }>;
};

type AppliedIncentive = {
  couponId: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  usageLimit: number | null;
  perUserLimit: number | null;
  discount: number;
};

type CreateOrderRouteDeps = {
  getCurrentUser: (request?: NextRequest) => Promise<{
    id: string;
    email?: string | null;
    memberLevel?: string | null;
  } | null>;
  findProducts: (
    productIds: string[],
  ) => Promise<
    Array<{
      id: string;
      name: string;
      price: number;
      stock: number;
      /** False means stock is never checked; absent means tracked. */
      trackStock?: boolean;
      categoryIds: string[];
    }>
  >;
  findVariants: (
    variantIds: string[],
  ) => Promise<
    Array<{
      id: string;
      productId: string;
      name: string;
      price: number;
      stock: number;
    }>
  >;
  findUserAddress: (
    userId: string,
    addressId: string,
  ) => Promise<{
    street: string;
    ward: string;
    district: string;
    province: string;
  } | null>;
  findIncentiveByCode: (
    code: string,
    user: { id: string | null; memberLevel?: string | null } | null,
  ) => Promise<IncentiveReadModel | null>;
  countUserCommittedIncentiveUsage: (
    couponId: string,
    userId: string,
  ) => Promise<number>;
  now: () => Date;
  createOrderWithItems: (args: {
    orderNumber: string;
    userId: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    customerAddress: string | null;
    pickupDate: Date | null;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    appliedIncentives?: AppliedIncentive[];
    appliedIncentive?: AppliedIncentive | null;
    paymentMethod: PaymentMethod;
    idempotencyKey: string | null;
    orderItems: Array<{
      productId: string;
      variantId: string | null;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
      message: string | null;
    }>;
    stockDecrements: StockDecrement[];
  }) => Promise<{
    id: string;
    orderNumber: string;
    orderItems: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }>;
  }>;
  createPaymentRecord: (args: {
    orderId: string;
    provider: 'MOMO' | 'VNPAY';
    amount: number;
  }) => Promise<void>;
  handlePaymentInitFailure: (args: {
    orderId: string;
    provider: 'MOMO' | 'VNPAY';
    reason: string;
  }) => Promise<void>;
  createMoMoPayment: typeof createMoMoPayment;
  createVNPayPayment: typeof createVNPayPayment;
  dispatchNotificationEvent?: (event: {
    eventType: 'ORDER_STATUS_CHANGED';
    entityId: string;
    correlationKey: string;
    targetUserId?: string | null;
    targetEmail?: string | null;
    payload?: Record<string, unknown>;
  }) => Promise<unknown>;
  getAppUrl: () => string;
  getMembershipConfig: () => Promise<MembershipRulesConfig>;
  getDeliverySettings: () => Promise<DeliverySettings>;
  findOrderByIdempotencyKey: (
    key: string,
  ) => Promise<IdempotentOrderSnapshot | null>;
  savePaymentUrl: (args: { orderId: string; payUrl: string }) => Promise<void>;
};

type IdempotentOrderSnapshot = {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: string;
  paymentMethod: PaymentMethod | null;
  total: number;
  orderItems: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  payment: { status: string; payUrl: string | null } | null;
};

export type OrderReadModel = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  pickupDate: Date | null;
  status: string;
  subtotal: unknown;
  deliveryFee: unknown;
  discount: unknown;
  total: unknown;
  paymentMethod: PaymentMethod | null;
  createdAt: Date;
  updatedAt: Date;
  orderItems: Array<{
    id: string;
    orderId: string;
    productId: string;
    variantId: string | null;
    name: string;
    message: string | null;
    quantity: number;
    price: unknown;
    subtotal: unknown;
    product: {
      id: string;
      name: string;
      price: unknown;
      images: Array<{ url: string }>;
    } | null;
  }>;
  payment: {
    id: string;
    orderId: string;
    provider: string;
    transactionId: string | null;
    amount: unknown;
    status: string;
    createdAt: Date;
  } | null;
};

type GetOrdersRouteDeps = {
  getCurrentUser: (request: NextRequest) => Promise<{ id: string } | null>;
  findOrdersByUserId: (
    userId: string,
    page: { skip: number; take: number },
  ) => Promise<OrderReadModel[]>;
  countOrdersByUserId: (userId: string) => Promise<number>;
};

// Same paging contract as /api/admin/orders.
const ORDERS_DEFAULT_PAGE = 1;
const ORDERS_DEFAULT_LIMIT = 20;
const ORDERS_MAX_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return typeof max === 'number' ? Math.min(parsed, max) : parsed;
}

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${dateStr}${rand}`;
}

function buildOrderSuccessData(args: {
  order: {
    id: string;
    orderNumber: string;
    orderItems: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }>;
  };
  orderNumber: string;
  paymentUrl: string | null;
  paymentError?: string;
  appliedIncentives: AppliedIncentive[];
}) {
  return {
    order: { ...args.order, orderNumber: args.orderNumber },
    paymentUrl: args.paymentUrl,
    ...(args.paymentError ? { paymentError: args.paymentError } : {}),
    appliedIncentive: args.appliedIncentives.length > 0
      ? {
          code: args.appliedIncentives[0].code,
          type: args.appliedIncentives[0].type,
          discount: args.appliedIncentives[0].discount,
        }
      : null,
    appliedIncentives: args.appliedIncentives.map((incentive) => ({
      code: incentive.code,
      type: incentive.type,
      discount: incentive.discount,
    })),
  };
}

const createOrderDeps: CreateOrderRouteDeps = {
  getCurrentUser: (request) =>
    request ? getCurrentUserFromRequest(request) : Promise.resolve(null),
  findProducts: (productIds) =>
    prisma.product
      .findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          trackStock: true,
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
          stock: product.stock,
          trackStock: product.trackStock,
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
  findUserAddress: (userId, addressId) =>
    prisma.address.findFirst({
      where: { id: addressId, userId },
      select: {
        street: true,
        ward: true,
        district: true,
        province: true,
      },
    }),
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
        targetSegment: assignment.targetSegment as 'SILVER' | 'GOLD' | 'PLATINUM' | null,
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
  now: () => new Date(),
  createOrderWithItems: (args) =>
    prisma.$transaction(
      async (tx) => {
        await decrementStock(tx, args.stockDecrements);

        const created = await tx.order.create({
          data: {
            orderNumber: args.orderNumber,
            userId: args.userId,
            customerName: args.customerName,
            customerPhone: args.customerPhone,
            customerEmail: args.customerEmail,
            customerAddress: args.customerAddress,
            pickupDate: args.pickupDate,
            subtotal: args.subtotal,
            deliveryFee: args.deliveryFee,
            discount: args.discount,
            total: args.total,
            paymentMethod: args.paymentMethod as never,
            idempotencyKey: args.idempotencyKey,
            status: 'PENDING',
            orderItems: {
              create: args.orderItems,
            },
          },
          include: {
            orderItems: true,
          },
        });
        const incentivesToReserve =
          args.appliedIncentives ??
          (args.appliedIncentive ? [args.appliedIncentive] : []);
        for (const incentive of incentivesToReserve) {
          await reserveCouponRedemption({
            tx,
            couponId: incentive.couponId,
            couponCode: incentive.code,
            usageLimit: incentive.usageLimit,
            perUserLimit: incentive.perUserLimit,
            orderId: created.id,
            userId: args.userId,
            reservedDiscount: incentive.discount,
          });
        }

        const rawItems = (created as { orderItems?: Array<{ productId: string; name: string; price: unknown; quantity: number; subtotal: unknown }> }).orderItems || [];
        return {
          id: created.id,
          orderNumber: created.orderNumber,
          orderItems: rawItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: Number(item.price),
            quantity: item.quantity,
            subtotal: Number(item.subtotal),
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  createPaymentRecord: async ({ orderId, provider, amount }) => {
    await prisma.payment.create({
      data: {
        orderId,
        provider,
        amount,
        status: 'PENDING',
      },
    });
  },
  handlePaymentInitFailure: async ({ orderId, provider, reason }) => {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          orderId,
          provider,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
        },
      });

      await cancelOrderAndRestoreStock(tx, orderId);

      await applyCouponLifecycleForOrderStatus({
        orderId,
        status: 'CANCELLED',
        reason,
        tx,
      });
    });
  },
  createMoMoPayment,
  createVNPayPayment,
  dispatchNotificationEvent,
  getAppUrl: () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  getMembershipConfig: getMembershipRulesConfig,
  getDeliverySettings: fetchDeliverySettings,
  findOrderByIdempotencyKey: async (key) => {
    const order = await prisma.order.findUnique({
      where: { idempotencyKey: key },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        paymentMethod: true,
        total: true,
        orderItems: {
          select: {
            productId: true,
            name: true,
            price: true,
            quantity: true,
            subtotal: true,
          },
        },
        payment: { select: { status: true, payUrl: true } },
      },
    });
    if (!order) return null;
    return {
      ...order,
      paymentMethod: order.paymentMethod as PaymentMethod | null,
      total: Number(order.total),
      orderItems: order.orderItems.map((item) => ({
        ...item,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
      })),
    };
  },
  savePaymentUrl: async ({ orderId, payUrl }) => {
    await prisma.payment.update({ where: { orderId }, data: { payUrl } });
  },
};

const getOrdersDeps: GetOrdersRouteDeps = {
  getCurrentUser: requireUserFromRequest,
  findOrdersByUserId: async (userId, { skip, take }) =>
    prisma.order.findMany({
      where: {
        userId,
      },
      skip,
      take,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: {
                  select: { url: true, isPrimary: true },
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Promise<OrderReadModel[]>,
  countOrdersByUserId: (userId) => prisma.order.count({ where: { userId } }),
};

/**
 * A gateway init that throws (network error, timeout, malformed reply) is a
 * failed init like any other, so the caller cancels the order instead of
 * leaving it PENDING with its stock and coupons held.
 */
async function settleGatewayInit(
  init: () => Promise<{ payUrl: string } | { error: string }>,
): Promise<{ payUrl: string } | { error: string }> {
  try {
    return await init();
  } catch (error) {
    console.error('Payment gateway init error:', error);
    return { error: 'Payment gateway is unavailable. Please try again.' };
  }
}

function resolveNormalizedIncentiveCodes(args: {
  incentiveCodeInput: unknown;
  incentiveCodesInput: unknown;
}): { codes: string[]; error?: string } {
  const normalizedSingle = normalizeIncentiveCode(args.incentiveCodeInput);
  if (normalizedSingle === '') {
    return {
      codes: [],
      error: 'Incentive code is invalid. Please enter a non-empty code.',
    };
  }

  const codes: string[] = [];
  if (Array.isArray(args.incentiveCodesInput)) {
    for (const value of args.incentiveCodesInput) {
      const normalized = normalizeIncentiveCode(value);
      if (normalized === '') {
        return {
          codes: [],
          error: 'One or more incentive codes are invalid.',
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
      error: 'You can apply up to 5 incentive codes per order.',
    };
  }

  return { codes: uniqueCodes };
}

export async function handleCreateOrderRequest(
  body: unknown,
  deps: CreateOrderRouteDeps = createOrderDeps,
  request?: NextRequest,
  idempotencyKey?: string | null,
) {
  if (!body || typeof body !== 'object') {
    return {
      status: 400,
      body: { success: false, error: 'Missing required fields' },
    };
  }

  if (idempotencyKey != null && !IDEMPOTENCY_KEY_REGEX.test(idempotencyKey)) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid Idempotency-Key' },
    };
  }

  const user = await deps.getCurrentUser(request);

  // Replay before any validation: the first attempt already took the stock,
  // so re-checking it could wrongly reject that attempt's own retry.
  if (idempotencyKey) {
    const existing = await deps.findOrderByIdempotencyKey(idempotencyKey);
    if (existing) return respondToRetry(deps, existing, user);
  }

  const payload = body as CreateOrderPayload;
  const {
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    paymentMethod,
    deliveryMethod,
    items,
    incentiveCode: incentiveCodeInput,
    incentiveCodes: incentiveCodesInput,
    pickupDate: pickupDateInput,
    addressId,
  } = payload;

  if (!customerName || !customerPhone || !paymentMethod || !items?.length) {
    return {
      status: 400,
      body: { success: false, error: 'Missing required fields' },
    };
  }

  const cleanPhone = customerPhone.replace(/[\s.-]/g, '');
  if (!VN_PHONE_REGEX.test(cleanPhone)) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid phone number' },
    };
  }

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid payment method' },
    };
  }

  if (
    deliveryMethod !== undefined &&
    deliveryMethod !== 'pickup' &&
    deliveryMethod !== 'delivery'
  ) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid delivery method' },
    };
  }

  for (const item of items) {
    if (!item.productId || !item.name || !item.price || !item.quantity) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid item data' },
      };
    }
    if (item.quantity < 1 || item.quantity > 100) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid item quantity' },
      };
    }
    if (
      (typeof item.message === 'string' ? item.message.trim() : '').length > 200
    ) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid item message' },
      };
    }
  }

  let pickupDate: Date | null = null;
  if (pickupDateInput) {
    const parsedPickupDate = new Date(pickupDateInput);
    if (Number.isNaN(parsedPickupDate.getTime())) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid pickup date' },
      };
    }
    pickupDate = parsedPickupDate;
  }

  const normalizedIncentiveCodesResult = resolveNormalizedIncentiveCodes({
    incentiveCodeInput,
    incentiveCodesInput,
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

  const products = await deps.findProducts(items.map((i) => i.productId!));
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId!);
    if (!product) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Product "${item.name}" is not available`,
        },
      };
    }
  }

  const variantIds = Array.from(
    new Set(
      items
        .map((item) => item.variantId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const variantMap = new Map<
    string,
    { id: string; productId: string; name: string; price: number; stock: number }
  >();
  if (variantIds.length > 0) {
    const variants = await deps.findVariants(variantIds);
    for (const variant of variants) {
      variantMap.set(variant.id, variant);
    }
  }

  for (const item of items) {
    if (!item.variantId) continue;
    const variant = variantMap.get(item.variantId);
    if (!variant || variant.productId !== item.productId) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Selected variant for "${item.name}" is not available`,
        },
      };
    }
  }

  // Stock is checked on totals across lines: two variants of one product are
  // separate lines drawing on the same product stock.
  const stockLines = items.map((item) => ({
    productId: item.productId!,
    variantId: item.variantId || null,
    quantity: item.quantity!,
  }));
  const stockDecrements: StockDecrement[] = [];
  for (const [productId, quantity] of sumQuantitiesBy(
    stockLines,
    (line) => line.productId,
  )) {
    const product = productMap.get(productId)!;
    const enforce = product.trackStock !== false;
    if (enforce && product.stock < quantity) {
      return {
        status: 400,
        body: {
          success: false,
          error: `"${product.name}" is out of stock (available: ${product.stock})`,
        },
      };
    }
    stockDecrements.push({ kind: 'product', id: productId, quantity, enforce });
  }
  for (const [variantId, quantity] of sumQuantitiesBy(
    stockLines,
    (line) => line.variantId,
  )) {
    const variant = variantMap.get(variantId)!;
    const product = productMap.get(variant.productId)!;
    const enforce = product.trackStock !== false;
    if (enforce && variant.stock < quantity) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Variant "${product.name}" is not available`,
        },
      };
    }
    stockDecrements.push({ kind: 'variant', id: variantId, quantity, enforce });
  }

  let addressSnapshot: string | null = null;
  if (addressId) {
    if (!user) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid address' },
      };
    }
    const address = await deps.findUserAddress(user.id, addressId);
    if (!address) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid address' },
      };
    }
    addressSnapshot = `${address.street}, ${address.ward}, ${address.district}, ${address.province}`;
  }

  const orderItems = items.map((item) => {
    const product = productMap.get(item.productId!)!;
    const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
    const price = variant ? variant.price : Number(product.price);
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    return {
      productId: item.productId!,
      variantId: item.variantId || null,
      name,
      price,
      quantity: item.quantity!,
      subtotal: price * item.quantity!,
      message: (typeof item.message === 'string' ? item.message.trim() : '') || null,
      categoryIds: product.categoryIds,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const membershipConfig = await deps.getMembershipConfig();
  const membershipDiscountPercent = user
    ? getDiscountPercentForLevel(membershipConfig, user.memberLevel)
    : 0;
  const membershipDiscount = Math.round(
    subtotal * (membershipDiscountPercent / 100),
  );

  let couponDiscount = 0;
  const appliedIncentives: AppliedIncentive[] = [];
  const cartItemsForEligibility = orderItems.map((item) => ({
    productId: item.productId,
    lineSubtotal: item.subtotal,
    categoryIds: item.categoryIds,
  }));
  const ignoreMembershipConflict = normalizedIncentiveCodes.length >= 1;

  for (const code of normalizedIncentiveCodes) {
    const incentive = await deps.findIncentiveByCode(code, {
      id: user?.id ?? null,
      memberLevel: user?.memberLevel ?? null,
    });

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
      cartItems: cartItemsForEligibility,
      membershipDiscount,
      userCommittedUsageCount,
      ignoreMembershipConflict,
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
      couponId: incentive.id,
      code,
      type: incentive.type,
      usageLimit: incentive.usageLimit,
      perUserLimit: incentive.perUserLimit,
      discount: appliedDiscount,
    });
  }

  const finalDiscount = membershipDiscount + couponDiscount;

  const deliveryAddress =
    addressSnapshot ?? (customerAddress?.trim() || null);
  // Only an explicit 'delivery' pays the fee — the same rule as
  // /api/incentives/preview. Clients that omit deliveryMethod were shown a
  // fee-less preview, so charging a fee here would exceed the displayed total.
  const isDelivery = deliveryMethod === 'delivery';
  const deliverySettings = await deps.getDeliverySettings();
  let deliveryFee = 0;
  if (isDelivery) {
    deliveryFee =
      deliverySettings.freeDeliveryThreshold > 0 &&
      subtotal >= deliverySettings.freeDeliveryThreshold
        ? 0
        : deliverySettings.deliveryFee;
  }

  const total = subtotal + deliveryFee - finalDiscount;

  if (total <= 0) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid order total' },
    };
  }

  const totalInt = Math.round(total);
  const orderNumber = generateOrderNumber();
  const persistableOrderItems = orderItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.subtotal,
    message: item.message,
  }));
  let order: Awaited<ReturnType<CreateOrderRouteDeps['createOrderWithItems']>>;
  try {
    order = await deps.createOrderWithItems({
      orderNumber,
      userId: user?.id || null,
      customerName,
      customerPhone,
      customerEmail: customerEmail || user?.email || null,
      customerAddress: deliveryAddress,
      pickupDate,
      subtotal,
      deliveryFee,
      discount: finalDiscount,
      total,
      paymentMethod,
      idempotencyKey: idempotencyKey || null,
      appliedIncentives,
      appliedIncentive: appliedIncentives[0] ?? null,
      orderItems: persistableOrderItems,
      stockDecrements,
    });
  } catch (error) {
    // A concurrent request with the same key won the race on the unique
    // index; this one rolled back, so answer with the winner's order.
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await deps.findOrderByIdempotencyKey(idempotencyKey);
      if (existing) return respondToRetry(deps, existing, user);
    }
    // A concurrent order took the stock between the check above and the
    // transaction.
    if (error instanceof Error && error.message === OUT_OF_STOCK) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Some items just sold out. Please review your cart.',
        },
      };
    }
    if (
      error instanceof Error &&
      error.message === INCENTIVE_USAGE_LIMIT_REACHED &&
      appliedIncentives.length > 0
    ) {
      return {
        status: 400,
        body: {
          success: false,
          error:
            'Incentive code is no longer available. Please try another code.',
        },
      };
    }
    if (
      error instanceof Error &&
      error.message === INCENTIVE_PER_USER_LIMIT_REACHED &&
      appliedIncentives.length > 0
    ) {
      return {
        status: 400,
        body: {
          success: false,
          error:
            'Incentive code has reached your personal usage limit. Please try another code.',
        },
      };
    }

    throw error;
  }

  const appUrl = deps.getAppUrl();
  const orderStatus = 'PENDING';
  if (deps.dispatchNotificationEvent) {
    void deps
      .dispatchNotificationEvent({
        eventType: 'ORDER_STATUS_CHANGED',
        entityId: order.id,
        correlationKey: `order:${order.id}:status:${orderStatus}`,
        targetUserId: user?.id ?? null,
        targetEmail: customerEmail || user?.email || null,
        payload: {
          orderId: order.id,
          orderNumber,
          orderStatus,
          paymentMethod,
          occurredAt: deps.now().toISOString(),
          linkUrl: `${appUrl}/orders/${orderNumber}`,
        },
      })
      .catch((error) => {
        console.error('Order notification dispatch error:', error);
      });
  }

  const payment =
    paymentMethod === 'MOMO' || paymentMethod === 'VNPAY'
      ? await startOnlinePayment(deps, {
          order: { id: order.id, orderNumber },
          provider: paymentMethod,
          amount: totalInt,
          createRecord: true,
        })
      : { paymentUrl: null };

  return {
    status: 200,
    body: {
      success: true,
      data: buildOrderSuccessData({
        order,
        orderNumber,
        paymentUrl: payment.paymentUrl,
        paymentError: payment.paymentError,
        appliedIncentives,
      }),
    },
  };
}

/**
 * Creates the gateway link for an order. A failed init cancels the order
 * (releasing its stock and coupons); a created link is stored so an
 * idempotent replay can hand out the same link — MoMo refuses a second
 * create for the same orderId.
 */
async function startOnlinePayment(
  deps: CreateOrderRouteDeps,
  args: {
    order: { id: string; orderNumber: string };
    provider: 'MOMO' | 'VNPAY';
    amount: number;
    /** False on a replay whose payment row already exists. */
    createRecord: boolean;
  },
): Promise<{ paymentUrl: string | null; paymentError?: string }> {
  const { order, provider, amount } = args;
  const appUrl = deps.getAppUrl();
  const result = await settleGatewayInit(async () => {
    if (args.createRecord) {
      await deps.createPaymentRecord({ orderId: order.id, provider, amount });
    }
    const description = `Thanh toán đơn hàng #${order.orderNumber}`;
    return provider === 'MOMO'
      ? deps.createMoMoPayment({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount,
          orderInfo: description,
          redirectUrl: `${appUrl}/checkout/success?order=${order.orderNumber}`,
          ipnUrl: `${appUrl}/api/payment/momo/callback`,
        })
      : deps.createVNPayPayment({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount,
          description,
          redirectUrl: `${appUrl}/api/payment/vnpay/callback`,
        });
  });

  if ('error' in result) {
    try {
      await deps.handlePaymentInitFailure({
        orderId: order.id,
        provider,
        reason: 'PAYMENT_INIT_FAILED',
      });
    } catch (cleanupError) {
      console.error(`${provider} payment init failure cleanup error:`, cleanupError);
    }
    return { paymentUrl: null, paymentError: result.error };
  }

  try {
    await deps.savePaymentUrl({ orderId: order.id, payUrl: result.payUrl });
  } catch (error) {
    // The customer still gets the link now; only a later replay loses it.
    console.error(`${provider} payment URL save error:`, error);
  }
  return { paymentUrl: result.payUrl };
}

/** A key belongs to whoever created the order with it. */
function respondToRetry(
  deps: CreateOrderRouteDeps,
  existing: IdempotentOrderSnapshot,
  user: { id: string } | null,
) {
  if ((existing.userId ?? null) !== (user?.id ?? null)) {
    return Promise.resolve({
      status: 409,
      body: {
        success: false,
        error: 'Idempotency-Key was already used for another order.',
      },
    });
  }
  return replayIdempotentOrder(deps, existing);
}

/**
 * Answers a retried create with the order the first attempt made, so a
 * request that timed out client-side never produces a second order.
 */
async function replayIdempotentOrder(
  deps: CreateOrderRouteDeps,
  existing: IdempotentOrderSnapshot,
) {
  let payment: { paymentUrl: string | null; paymentError?: string } = {
    paymentUrl: null,
  };
  const provider =
    existing.paymentMethod === 'MOMO' || existing.paymentMethod === 'VNPAY'
      ? existing.paymentMethod
      : null;

  if (existing.status === 'CANCELLED') {
    // Typically the first attempt's payment init failed and cancelled it.
    payment = {
      paymentUrl: null,
      paymentError: 'This order was cancelled. Please place a new order.',
    };
  } else if (provider && existing.payment?.status === 'PENDING' && existing.payment.payUrl) {
    payment = { paymentUrl: existing.payment.payUrl };
  } else if (provider && (!existing.payment || existing.payment.status === 'PENDING')) {
    // The first attempt died before its gateway link was stored.
    payment = await startOnlinePayment(deps, {
      order: { id: existing.id, orderNumber: existing.orderNumber },
      provider,
      amount: Math.round(existing.total),
      createRecord: !existing.payment,
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        ...buildOrderSuccessData({
          order: {
            id: existing.id,
            orderNumber: existing.orderNumber,
            orderItems: existing.orderItems,
          },
          orderNumber: existing.orderNumber,
          paymentUrl: payment.paymentUrl,
          paymentError: payment.paymentError,
          appliedIncentives: [],
        }),
        replayed: true,
      },
    },
  };
}

export function serializeOrder(order: OrderReadModel) {
  return {
    ...order,
    pickupDate: order.pickupDate ? order.pickupDate.toISOString() : null,
    subtotal: asNumber(order.subtotal),
    deliveryFee: asNumber(order.deliveryFee),
    discount: asNumber(order.discount),
    total: asNumber(order.total),
    orderItems: order.orderItems.map((item) => ({
      ...item,
      price: asNumber(item.price),
      subtotal: asNumber(item.subtotal),
      product: item.product
        ? {
            ...item.product,
            price: asNumber(item.product.price),
          }
        : null,
    })),
    payment: order.payment
      ? {
          ...order.payment,
          amount: asNumber(order.payment.amount),
        }
      : null,
  };
}

export async function handleGetOrdersRequest(
  request: NextRequest,
  deps: GetOrdersRouteDeps = getOrdersDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);

    if (!user) {
      return {
        status: 401,
        body: { success: false, error: 'Unauthorized' },
      };
    }

    // Clients that send no paging params get the newest page.
    const searchParams = request.nextUrl?.searchParams;
    const page = parsePositiveInt(
      searchParams?.get('page') ?? null,
      ORDERS_DEFAULT_PAGE,
    );
    const limit = parsePositiveInt(
      searchParams?.get('limit') ?? null,
      ORDERS_DEFAULT_LIMIT,
      ORDERS_MAX_LIMIT,
    );
    const [orders, total] = await Promise.all([
      deps.findOrdersByUserId(user.id, { skip: (page - 1) * limit, take: limit }),
      deps.countOrdersByUserId(user.id),
    ]);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          orders: orders.map(serializeOrder),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: { success: false, error: message },
      };
    }
    console.error('Get orders error:', error);
    return {
      status: 500,
      body: { success: false, error: 'Failed to fetch orders' },
    };
  }
}

// GET: Get user's orders
export async function GET(request: NextRequest) {
  const result = await handleGetOrdersRequest(request, getOrdersDeps);
  return NextResponse.json(result.body, { status: result.status });
}

// POST: Create a new order
export async function POST(request: NextRequest) {
  const rateLimit = enforceIpRateLimit(
    request,
    'orders',
    RATE_LIMITS.ORDERS_PER_IP,
  );
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      },
    );
  }

  try {
    const body = await request.json();
    const result = await handleCreateOrderRequest(
      body,
      createOrderDeps,
      request,
      request.headers.get('idempotency-key'),
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 },
    );
  }
}


