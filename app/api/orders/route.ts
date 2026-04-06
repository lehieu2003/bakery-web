import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';
import { createMoMoPayment } from '@/lib/payment/momo';
import { createZaloPayPayment } from '@/lib/payment/zalopay';
import {
  getDiscountPercentForLevel,
  getMembershipRulesConfig,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';
import { PaymentMethod } from '@prisma/client';

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'COD',
  'BANK_TRANSFER',
  'MOMO',
  'ZALOPAY',
];
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

type CreateOrderPayload = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod?: PaymentMethod;
  items?: Array<{
    productId?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
};

type CreateOrderRouteDeps = {
  getCurrentUser: (request?: NextRequest) => Promise<{
    id: string;
    email?: string | null;
    memberLevel?: string | null;
  } | null>;
  findProducts: (productIds: string[]) => Promise<
    Array<{ id: string; name: string; price: number; stock: number }>
  >;
  createOrderWithItems: (args: {
    orderNumber: string;
    userId: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    subtotal: number;
    discount: number;
    total: number;
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
    provider: 'MOMO' | 'ZALOPAY';
    amount: number;
  }) => Promise<void>;
  createMoMoPayment: typeof createMoMoPayment;
  createZaloPayPayment: typeof createZaloPayPayment;
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

const createOrderDeps: CreateOrderRouteDeps = {
  getCurrentUser: (request) =>
    request ? getCurrentUserFromRequest(request) : Promise.resolve(null),
  findProducts: (productIds) =>
    prisma.product
      .findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, name: true, price: true, stock: true },
      })
      .then((products) =>
        products.map((product) => ({
          ...product,
          price: Number(product.price),
        })),
      ),
  createOrderWithItems: (args) =>
    prisma.$transaction(async (tx) => {
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
    }),
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
  createMoMoPayment,
  createZaloPayPayment,
  getAppUrl: () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  getMembershipConfig: getMembershipRulesConfig,
};

const getOrdersDeps: GetOrdersRouteDeps = {
  getCurrentUser: getCurrentUserFromRequest,
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
  const { customerName, customerPhone, customerEmail, paymentMethod, items } =
    payload;

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
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const membershipConfig = await deps.getMembershipConfig();
  const discountPercent = user
    ? getDiscountPercentForLevel(membershipConfig, user.memberLevel)
    : 0;
  const discountRate = discountPercent / 100;
  const discount = Math.round(subtotal * discountRate);
  const total = subtotal - discount;

  if (total <= 0) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid order total' },
    };
  }

  const totalInt = Math.round(total);
  const orderNumber = generateOrderNumber();
  const order = await deps.createOrderWithItems({
    orderNumber,
    userId: user?.id || null,
    customerName,
    customerPhone,
    customerEmail: customerEmail || user?.email || null,
    subtotal,
    discount,
    total,
    paymentMethod,
    orderItems,
  });

  const appUrl = deps.getAppUrl();
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
      return {
        status: 200,
        body: {
          success: true,
          data: {
            order: { ...order, orderNumber },
            paymentUrl: null,
            paymentError: result.error,
          },
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: { order: { ...order, orderNumber }, paymentUrl: result.payUrl },
      },
    };
  }

  if (paymentMethod === 'ZALOPAY') {
    await deps.createPaymentRecord({
      orderId: order.id,
      provider: 'ZALOPAY',
      amount: totalInt,
    });

    const result = await deps.createZaloPayPayment({
      orderId: order.id,
      orderNumber,
      amount: totalInt,
      description: `Thanh toán đơn hàng #${orderNumber}`,
      redirectUrl: successUrl,
      callbackUrl: `${appUrl}/api/payment/zalopay/callback`,
      items: orderItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    if ('error' in result) {
      return {
        status: 200,
        body: {
          success: true,
          data: {
            order: { ...order, orderNumber },
            paymentUrl: null,
            paymentError: result.error,
          },
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: { order: { ...order, orderNumber }, paymentUrl: result.payUrl },
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { order: { ...order, orderNumber }, paymentUrl: null },
    },
  };
}

function asNumber(value: unknown): number {
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
    const result = await handleCreateOrderRequest(body, createOrderDeps, request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 },
    );
  }
}


