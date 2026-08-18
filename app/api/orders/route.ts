import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';
import { createMoMoPayment } from '@/lib/payment/momo';
import { createVNPayPayment } from '@/lib/payment/vnpay';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';
import {
  getDiscountPercentForLevel,
  getMembershipRulesConfig,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';
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
import { Prisma } from '@prisma/client';
import type { PaymentMethod } from '@/types/api.types';

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'COD',
  'BANK_TRANSFER',
  'MOMO',
  'VNPAY',
];
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

type CreateOrderPayload = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  paymentMethod?: PaymentMethod;
  incentiveCode?: string;
  incentiveCodes?: string[];
  items?: Array<{
    productId?: string;
    name?: string;
    price?: number;
    quantity?: number;
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
      categoryIds: string[];
    }>
  >;
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
    subtotal: number;
    discount: number;
    total: number;
    appliedIncentives?: AppliedIncentive[];
    appliedIncentive?: AppliedIncentive | null;
    paymentMethod: PaymentMethod;
    orderItems: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }>;
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
};

type OrderReadModel = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
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
  findOrdersByUserId: (userId: string) => Promise<OrderReadModel[]>;
};

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
        for (const item of args.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        const created = await tx.order.create({
          data: {
            orderNumber: args.orderNumber,
            userId: args.userId,
            customerName: args.customerName,
            customerPhone: args.customerPhone,
            customerEmail: args.customerEmail,
            customerAddress: args.customerAddress,
            subtotal: args.subtotal,
            deliveryFee: 0,
            discount: args.discount,
            total: args.total,
            paymentMethod: args.paymentMethod,
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

        return {
          id: created.id,
          orderNumber: created.orderNumber,
          orderItems: created.orderItems.map((item) => ({
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

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

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
};

const getOrdersDeps: GetOrdersRouteDeps = {
  getCurrentUser: requireUserFromRequest,
  findOrdersByUserId: async (userId) =>
    prisma.order.findMany({
      where: {
        userId,
      },
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
};

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
) {
  if (!body || typeof body !== 'object') {
    return {
      status: 400,
      body: { success: false, error: 'Missing required fields' },
    };
  }

  const payload = body as CreateOrderPayload;
  const {
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    paymentMethod,
    items,
    incentiveCode: incentiveCodeInput,
    incentiveCodes: incentiveCodesInput,
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

    if (product.stock < item.quantity!) {
      return {
        status: 400,
        body: {
          success: false,
          error: `"${product.name}" is out of stock (available: ${product.stock})`,
        },
      };
    }
  }

  const user = await deps.getCurrentUser(request);
  const orderItems = items.map((item) => {
    const product = productMap.get(item.productId!)!;
    const price = Number(product.price);
    return {
      productId: item.productId!,
      name: product.name,
      price,
      quantity: item.quantity!,
      subtotal: price * item.quantity!,
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

  const total = subtotal - finalDiscount;

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
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));
  let order: Awaited<ReturnType<CreateOrderRouteDeps['createOrderWithItems']>>;
  try {
    order = await deps.createOrderWithItems({
      orderNumber,
      userId: user?.id || null,
      customerName,
      customerPhone,
      customerEmail: customerEmail || user?.email || null,
      customerAddress: customerAddress?.trim() || null,
      subtotal,
      discount: finalDiscount,
      total,
      paymentMethod,
      appliedIncentives,
      appliedIncentive: appliedIncentives[0] ?? null,
      orderItems: persistableOrderItems,
    });
  } catch (error) {
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
          linkUrl: `${appUrl}/orders`,
        },
      })
      .catch((error) => {
        console.error('Order notification dispatch error:', error);
      });
  }

  const successUrl = `${appUrl}/checkout/success?order=${orderNumber}`;

  if (paymentMethod === 'MOMO') {
    await deps.createPaymentRecord({
      orderId: order.id,
      provider: 'MOMO',
      amount: totalInt,
    });

    const result = await deps.createMoMoPayment({
      orderId: order.id,
      orderNumber,
      amount: totalInt,
      orderInfo: `Thanh toán đơn hàng #${orderNumber}`,
      redirectUrl: successUrl,
      ipnUrl: `${appUrl}/api/payment/momo/callback`,
    });

    if ('error' in result) {
      try {
        await deps.handlePaymentInitFailure({
          orderId: order.id,
          provider: 'MOMO',
          reason: 'PAYMENT_INIT_FAILED',
        });
      } catch (cleanupError) {
        console.error('MoMo payment init failure cleanup error:', cleanupError);
      }
      return {
        status: 200,
        body: {
          success: true,
          data: buildOrderSuccessData({
            order,
            orderNumber,
            paymentUrl: null,
            paymentError: result.error,
            appliedIncentives,
          }),
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: buildOrderSuccessData({
          order,
          orderNumber,
          paymentUrl: result.payUrl,
          appliedIncentives,
        }),
      },
    };
  }

  if (paymentMethod === 'VNPAY') {
    await deps.createPaymentRecord({
      orderId: order.id,
      provider: 'VNPAY',
      amount: totalInt,
    });

    const result = await deps.createVNPayPayment({
      orderId: order.id,
      orderNumber,
      amount: totalInt,
      description: `Thanh toán đơn hàng #${orderNumber}`,
      redirectUrl: `${appUrl}/api/payment/vnpay/callback`,
    });

    if ('error' in result) {
      try {
        await deps.handlePaymentInitFailure({
          orderId: order.id,
          provider: 'VNPAY',
          reason: 'PAYMENT_INIT_FAILED',
        });
      } catch (cleanupError) {
        console.error(
          'VNPay payment init failure cleanup error:',
          cleanupError,
        );
      }
      return {
        status: 200,
        body: {
          success: true,
          data: buildOrderSuccessData({
            order,
            orderNumber,
            paymentUrl: null,
            paymentError: result.error,
            appliedIncentives,
          }),
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: buildOrderSuccessData({
          order,
          orderNumber,
          paymentUrl: result.payUrl,
          appliedIncentives,
        }),
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: buildOrderSuccessData({
        order,
        orderNumber,
        paymentUrl: null,
        appliedIncentives,
      }),
    },
  };
}

function serializeOrder(order: OrderReadModel) {
  return {
    ...order,
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

    const orders = await deps.findOrdersByUserId(user.id);

    return {
      status: 200,
      body: {
        success: true,
        data: { orders: orders.map(serializeOrder) },
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
  try {
    const body = await request.json();
    const result = await handleCreateOrderRequest(
      body,
      createOrderDeps,
      request,
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


