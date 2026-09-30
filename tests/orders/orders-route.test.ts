import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleCreateOrderRequest,
  handleGetOrdersRequest,
} from '@/app/api/orders/route';
import { INCENTIVE_PER_USER_LIMIT_REACHED } from '@/lib/incentives/redemption-lifecycle';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type CreateOrderDeps = NonNullable<
  Parameters<typeof handleCreateOrderRequest>[1]
>;
type CreateOrderWithItemsArgs = Parameters<
  CreateOrderDeps['createOrderWithItems']
>[0];

type IncentiveFixture = {
  id: string;
  code: string;
  sourceType: 'PUBLIC' | 'TARGETED' | 'TRIGGERED';
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  scopeProductIds: string[];
  scopeCategoryIds: string[];
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  assignments: Array<{
    userId: string | null;
    targetSegment: 'SILVER' | 'GOLD' | 'PLATINUM' | null;
    isActive: boolean;
    expiresAt: Date | null;
  }>;
};

function createDeps(): CreateOrderDeps {
  const order = {
    id: 'o1',
    orderNumber: 'BK260405ABCD',
    orderItems: [],
  };

  return {
    getCurrentUser: async () => null,
    findProducts: async () => [
      {
        id: 'p1',
        name: 'Cake A',
        price: 100000,
        stock: 10,
        categoryIds: ['cat-cake'],
      },
    ],
    findVariants: async () => [],
    findUserAddress: async () => null,
    findIncentiveByCode: async () => null,
    countUserCommittedIncentiveUsage: async () => 0,
    now: () => new Date('2026-04-06T12:00:00.000Z'),
    createOrderWithItems: async () => order,
    createPaymentRecord: async () => undefined,
    handlePaymentInitFailure: async () => undefined,
    createMoMoPayment: async () => ({ payUrl: 'https://pay.example/momo' }),
    createVNPayPayment: async () => ({ payUrl: 'https://pay.example/vnpay' }),
    getAppUrl: () => 'http://localhost:3000',
    getMembershipConfig: async () => ({
      pointsPerOrder: 10000,
      levels: [
        { level: 'SILVER', label: 'Silver', minPoints: 0, discountPercent: 3 },
        { level: 'GOLD', label: 'Gold', minPoints: 300, discountPercent: 7 },
        {
          level: 'PLATINUM',
          label: 'Platinum',
          minPoints: 900,
          discountPercent: 12,
        },
      ],
    }),
    getDeliverySettings: async () => ({ deliveryFee: 0, freeDeliveryThreshold: 0 }),
  };
}

function buildPayload(method: 'COD' | 'MOMO' | 'VNPAY' | 'BANK_TRANSFER') {
  return {
    customerName: 'Lan',
    customerPhone: '0909123456',
    customerEmail: 'lan@example.com',
    customerAddress: '12 Nguyen Trai, District 1, HCMC',
    paymentMethod: method,
    items: [
      {
        productId: 'p1',
        name: 'Cake A',
        price: 100000,
        quantity: 2,
      },
    ],
  };
}

function withDeps(
  base: CreateOrderDeps,
  overrides: Partial<CreateOrderDeps>,
): CreateOrderDeps {
  return { ...base, ...overrides };
}

function createIncentiveFixture(
  overrides: Partial<IncentiveFixture> = {},
): IncentiveFixture {
  return {
    id: 'coupon-welcome10',
    code: 'WELCOME10',
    sourceType: 'PUBLIC',
    type: 'PERCENTAGE',
    value: 10,
    minOrder: null,
    maxDiscount: null,
    usageLimit: null,
    perUserLimit: null,
    scopeProductIds: [],
    scopeCategoryIds: [],
    startAt: new Date('2026-04-01T00:00:00.000Z'),
    endAt: new Date('2026-04-30T23:59:59.000Z'),
    isActive: true,
    assignments: [],
    ...overrides,
  };
}

test('POST /api/orders rejects missing required fields', async () => {
  const result = await handleCreateOrderRequest({}, createDeps());
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Missing required fields');
});

test('POST /api/orders rejects invalid Vietnamese phone number', async () => {
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), customerPhone: 'abc' },
    createDeps(),
  );
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Invalid phone number');
});

test('POST /api/orders rejects invalid payment method', async () => {
  const payload = buildPayload('COD') as Mutable<ReturnType<typeof buildPayload>>;
  payload.paymentMethod = 'INVALID' as never;

  const result = await handleCreateOrderRequest(payload, createDeps());
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Invalid payment method');
});

test('POST /api/orders rejects invalid item quantity bounds', async () => {
  const payload = buildPayload('COD');
  payload.items[0].quantity = 101;
  const result = await handleCreateOrderRequest(payload, createDeps());

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Invalid item quantity');
});

test('POST /api/orders rejects unavailable product', async () => {
  const deps = createDeps();
  deps.findProducts = async () => [];
  const result = await handleCreateOrderRequest(buildPayload('COD'), deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Product "Cake A" is not available');
});

test('POST /api/orders returns success envelope with paymentUrl=null for COD', async () => {
  const result = await handleCreateOrderRequest(buildPayload('COD'), createDeps());

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.paymentUrl, null);
  assert.equal(result.body.data?.paymentError, undefined);
});

test('POST /api/orders persists checkout delivery address', async () => {
  const deps = createDeps();
  let capturedAddress: string | null | undefined;

  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedAddress = args.customerAddress;
    return {
      id: 'o-address',
      orderNumber: 'BK260406ADDR',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(buildPayload('COD'), deps);

  assert.equal(result.status, 200);
  assert.equal(capturedAddress, '12 Nguyen Trai, District 1, HCMC');
});

test('POST /api/orders returns success envelope with paymentUrl=null for BANK_TRANSFER', async () => {
  const result = await handleCreateOrderRequest(
    buildPayload('BANK_TRANSFER'),
    createDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.paymentUrl, null);
});

test('POST /api/orders returns paymentUrl for MOMO on gateway success', async () => {
  const result = await handleCreateOrderRequest(buildPayload('MOMO'), createDeps());

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.paymentUrl, 'https://pay.example/momo');
});

test('POST /api/orders returns paymentError for VNPAY gateway failures', async () => {
  const deps = createDeps();
  deps.createVNPayPayment = async () =>
    ({ error: 'gateway unavailable' }) as never;

  const result = await handleCreateOrderRequest(buildPayload('VNPAY'), deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.paymentUrl, null);
  assert.equal(result.body.data?.paymentError, 'gateway unavailable');
});

test('POST /api/orders resolves membership discount from shared membership settings', async () => {
  const deps = createDeps();
  let capturedArgs:
    | {
        subtotal: number;
        discount: number;
        total: number;
      }
    | undefined;

  deps.getCurrentUser = async () => ({
    id: 'u-gold',
    email: 'gold@example.com',
    memberLevel: 'GOLD',
  });
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = {
      subtotal: args.subtotal,
      discount: args.discount,
      total: args.total,
    };
    return {
      id: 'o-membership',
      orderNumber: 'BK260406GOLD',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(buildPayload('COD'), deps);

  assert.equal(result.status, 200);
  assert.equal(capturedArgs?.subtotal, 200000);
  // GOLD default discount from membership settings should be 7%.
  assert.equal(capturedArgs?.discount, 14000);
  assert.equal(capturedArgs?.total, 186000);
});

test('POST /api/orders rejects blank incentive code input', async () => {
  const result = await handleCreateOrderRequest(
    {
      ...buildPayload('COD'),
      incentiveCode: '   ',
    },
    createDeps(),
  );

  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code is invalid. Please enter a non-empty code.',
  );
});

test('POST /api/orders stacks membership and coupon discount for eligible incentive', async () => {
  const deps = createDeps();
  let capturedArgs:
    | {
        subtotal: number;
        discount: number;
        total: number;
      }
    | undefined;

  deps.getCurrentUser = async () => ({
    id: 'u-gold',
    email: 'gold@example.com',
    memberLevel: 'GOLD',
  });
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'SPRING20',
      type: 'PERCENTAGE',
      value: 20,
    });
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = {
      subtotal: args.subtotal,
      discount: args.discount,
      total: args.total,
    };
    return {
      id: 'o-incentive',
      orderNumber: 'BK260406INCENTIVE',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'spring20' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(capturedArgs?.subtotal, 200000);
  assert.equal(capturedArgs?.discount, 54000);
  assert.equal(capturedArgs?.total, 146000);
  assert.deepEqual(result.body.data?.appliedIncentive, {
    code: 'SPRING20',
    type: 'PERCENTAGE',
    discount: 40000,
  });
  assert.deepEqual(result.body.data?.appliedIncentives, [
    {
      code: 'SPRING20',
      type: 'PERCENTAGE',
      discount: 40000,
    },
  ]);
});
test('POST /api/orders applies FIXED incentive amount correctly', async () => {
  const deps = createDeps();
  let capturedArgs:
    | {
        discount: number;
        total: number;
      }
    | undefined;

  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'SAVE50K',
      type: 'FIXED',
      value: 50000,
    });
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = {
      discount: args.discount,
      total: args.total,
    };
    return {
      id: 'o-fixed',
      orderNumber: 'BK260406FIXED',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'save50k' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(capturedArgs?.discount, 50000);
  assert.equal(capturedArgs?.total, 150000);
  assert.deepEqual(result.body.data?.appliedIncentive, {
    code: 'SAVE50K',
    type: 'FIXED',
    discount: 50000,
  });
});

test('POST /api/orders caps percentage incentive by maxDiscount', async () => {
  const deps = createDeps();
  let capturedArgs:
    | {
        discount: number;
        total: number;
      }
    | undefined;

  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'CAP30',
      type: 'PERCENTAGE',
      value: 50,
      maxDiscount: 30000,
    });
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = {
      discount: args.discount,
      total: args.total,
    };
    return {
      id: 'o-capped',
      orderNumber: 'BK260406CAP',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'cap30' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(capturedArgs?.discount, 30000);
  assert.equal(capturedArgs?.total, 170000);
  assert.deepEqual(result.body.data?.appliedIncentive, {
    code: 'CAP30',
    type: 'PERCENTAGE',
    discount: 30000,
  });
});

test('POST /api/orders rejects invalid or inactive incentive code', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async () => null;

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'bad-code' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code "BAD-CODE" is invalid or inactive.',
  );
});

test('POST /api/orders rejects incentive code that is not active yet', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'FUTURE10',
      startAt: new Date('2026-05-01T00:00:00.000Z'),
    });

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'future10' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code "FUTURE10" is not active yet.',
  );
});

test('POST /api/orders rejects expired incentive code', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'OLD10',
      endAt: new Date('2026-03-31T23:59:59.000Z'),
    });

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'old10' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Incentive code "OLD10" has expired.');
});

test('POST /api/orders rejects incentive code that reached usage limit', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'LIMIT10',
      usageLimit: 0,
    });

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'limit10' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code "LIMIT10" has reached its usage limit.',
  );
});
test('POST /api/orders rejects incentive when usage limit is exhausted during transaction', async () => {
  const deps = createDeps();
  let capturedArgs: CreateOrderWithItemsArgs | undefined;

  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'FLASH30',
      type: 'FIXED',
      value: 30000,
      usageLimit: 1,
    });
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = args;
    throw new Error('INCENTIVE_USAGE_LIMIT_REACHED');
  };

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'flash30' },
    deps,
  );

  assert.equal(capturedArgs?.appliedIncentive?.code, 'FLASH30');
  assert.equal(capturedArgs?.appliedIncentive?.usageLimit, 1);
  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code is no longer available. Please try another code.',
  );
});

test('POST /api/orders rejects incentive code when subtotal is below minimum order', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'MIN300',
      minOrder: 300000,
    });

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'min300' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code "MIN300" requires a minimum order of 300.000đ.',
  );
});

test('POST /api/orders applies incentive even when coupon is smaller than membership discount', async () => {
  const deps = createDeps();
  deps.getCurrentUser = async () => ({
    id: 'u-gold',
    email: 'gold@example.com',
    memberLevel: 'GOLD',
  });
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'TENPERCENT',
      type: 'PERCENTAGE',
      value: 5,
    });

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'tenpercent' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data?.appliedIncentive, {
    code: 'TENPERCENT',
    type: 'PERCENTAGE',
    discount: 10000,
  });
});

test('GET /api/orders returns 401 when user is unauthenticated', async () => {
  const result = await handleGetOrdersRequest({} as never, {
    getCurrentUser: async () => null,
    findOrdersByUserId: async () => [],
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('GET /api/orders returns serialized orders for authenticated user', async () => {
  const result = await handleGetOrdersRequest({} as never, {
    getCurrentUser: async () => ({ id: 'u1' }),
    findOrdersByUserId: async () => [
      {
        id: 'o1',
        orderNumber: 'BK260405ABCD',
        userId: 'u1',
        customerName: 'Lan',
        customerPhone: '0909123456',
        customerEmail: 'lan@example.com',
        customerAddress: null,
        pickupDate: new Date('2026-10-05T00:00:00.000Z'),
        status: 'CONFIRMED',
        subtotal: '200000',
        deliveryFee: '0',
        discount: '10000',
        total: '190000',
        paymentMethod: 'MOMO',
        createdAt: new Date('2026-04-05T10:00:00.000Z'),
        updatedAt: new Date('2026-04-05T10:00:00.000Z'),
        orderItems: [
          {
            id: 'oi1',
            orderId: 'o1',
            productId: 'p1',
            variantId: null,
            name: 'Cake A',
            message: 'Less sugar, write "Happy Birthday"',
            quantity: 2,
            price: '100000',
            subtotal: '200000',
            product: {
              id: 'p1',
              name: 'Cake A',
              price: '100000',
              images: [{ url: '/img.jpg' }],
            },
          },
        ],
        payment: {
          id: 'pay1',
          orderId: 'o1',
          provider: 'MOMO',
          transactionId: 'tx-1',
          amount: '190000',
          status: 'PAID',
          createdAt: new Date('2026-04-05T10:01:00.000Z'),
        },
      },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.orders.length, 1);
  assert.equal(result.body.data?.orders[0].total, 190000);
  assert.equal(result.body.data?.orders[0].orderItems[0].price, 100000);
  assert.equal(result.body.data?.orders[0].payment?.amount, 190000);
  assert.equal(
    result.body.data?.orders[0].pickupDate,
    '2026-10-05T00:00:00.000Z',
  );
  assert.equal(
    result.body.data?.orders[0].orderItems[0].message,
    'Less sugar, write "Happy Birthday"',
  );
});

test('GET /api/orders sanitizes invalid numeric fields to 0', async () => {
  const result = await handleGetOrdersRequest({} as never, {
    getCurrentUser: async () => ({ id: 'u1' }),
    findOrdersByUserId: async () => [
      {
        id: 'o2',
        orderNumber: 'BK260405WXYZ',
        userId: 'u1',
        customerName: 'Lan',
        customerPhone: '0909123456',
        customerEmail: 'lan@example.com',
        customerAddress: null,
        pickupDate: null,
        status: 'PENDING',
        subtotal: 'invalid',
        deliveryFee: Number.NaN,
        discount: Infinity,
        total: '-not-a-number',
        paymentMethod: 'MOMO',
        createdAt: new Date('2026-04-05T10:00:00.000Z'),
        updatedAt: new Date('2026-04-05T10:00:00.000Z'),
        orderItems: [
          {
            id: 'oi2',
            orderId: 'o2',
            productId: 'p2',
            variantId: null,
            name: 'Cake B',
            message: null,
            quantity: 1,
            price: 'oops',
            subtotal: Number.NaN,
            product: {
              id: 'p2',
              name: 'Cake B',
              price: Infinity,
              images: [{ url: '/img2.jpg' }],
            },
          },
        ],
        payment: {
          id: 'pay2',
          orderId: 'o2',
          provider: 'MOMO',
          transactionId: 'tx-2',
          amount: 'bad-amount',
          status: 'PENDING',
          createdAt: new Date('2026-04-05T10:01:00.000Z'),
        },
      },
    ],
  });

  const order = result.body.data?.orders[0];
  assert.equal(result.status, 200);
  assert.equal(order?.subtotal, 0);
  assert.equal(order?.deliveryFee, 0);
  assert.equal(order?.discount, 0);
  assert.equal(order?.total, 0);
  assert.equal(order?.orderItems[0].price, 0);
  assert.equal(order?.orderItems[0].subtotal, 0);
  assert.equal(order?.orderItems[0].product?.price, 0);
  assert.equal(order?.payment?.amount, 0);
});

test('POST /api/orders clamps negative membership discounts to avoid surcharges', async () => {
  const deps = createDeps();
  let capturedArgs:
    | {
        subtotal: number;
        discount: number;
        total: number;
      }
    | undefined;

  deps.getCurrentUser = async () => ({
    id: 'u-gold',
    email: 'gold@example.com',
    memberLevel: 'GOLD',
  });
  deps.getMembershipConfig = async () => ({
    pointsPerOrder: 10000,
    levels: [
      { level: 'SILVER', label: 'Silver', minPoints: 0, discountPercent: 3 },
      { level: 'GOLD', label: 'Gold', minPoints: 300, discountPercent: -20 },
      {
        level: 'PLATINUM',
        label: 'Platinum',
        minPoints: 900,
        discountPercent: 12,
      },
    ],
  });
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = {
      subtotal: args.subtotal,
      discount: args.discount,
      total: args.total,
    };
    return {
      id: 'o-no-surcharge',
      orderNumber: 'BK260406SAFE',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(buildPayload('COD'), deps);

  assert.equal(result.status, 200);
  assert.equal(capturedArgs?.subtotal, 200000);
  assert.equal(capturedArgs?.discount, 0);
  assert.equal(capturedArgs?.total, 200000);
});








test('POST /api/orders cancels order and releases reserved coupon when MoMo init fails', async () => {
  const deps = createDeps();
  const cleanupCalls: Array<{ orderId: string; provider: 'MOMO' | 'VNPAY'; reason: string }> = [];
  deps.createMoMoPayment = async () =>
    ({ error: 'momo init failed' }) as never;
  deps.handlePaymentInitFailure = async (args) => {
    cleanupCalls.push(args);
  };
  const result = await handleCreateOrderRequest(buildPayload('MOMO'), deps);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.paymentError, 'momo init failed');
  assert.deepEqual(cleanupCalls, [
    {
      orderId: 'o1',
      provider: 'MOMO',
      reason: 'PAYMENT_INIT_FAILED',
    },
  ]);
});
test('POST /api/orders cancels order and releases reserved coupon when VNPay init fails', async () => {
  const deps = createDeps();
  const cleanupCalls: Array<{ orderId: string; provider: 'MOMO' | 'VNPAY'; reason: string }> = [];
  deps.createVNPayPayment = async () =>
    ({ error: 'vnpay init failed' }) as never;
  deps.handlePaymentInitFailure = async (args) => {
    cleanupCalls.push(args);
  };
  const result = await handleCreateOrderRequest(buildPayload('VNPAY'), deps);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.paymentError, 'vnpay init failed');
  assert.deepEqual(cleanupCalls, [
    {
      orderId: 'o1',
      provider: 'VNPAY',
      reason: 'PAYMENT_INIT_FAILED',
    },
  ]);
});
test('POST /api/orders rejects incentive when per-user limit is exhausted during transaction', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async () =>
    createIncentiveFixture({
      code: 'ONCEONLY',
      type: 'FIXED',
      value: 20000,
      perUserLimit: 1,
    });
  deps.getCurrentUser = async () => ({
    id: 'u1',
    email: 'u1@example.com',
    memberLevel: 'SILVER',
  });
  deps.createOrderWithItems = async () => {
    throw new Error(INCENTIVE_PER_USER_LIMIT_REACHED);
  };
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCode: 'onceonly' },
    deps,
  );
  assert.equal(result.status, 400);
  assert.equal(
    result.body.error,
    'Incentive code has reached your personal usage limit. Please try another code.',
  );
});



test('POST /api/orders supports multiple incentive codes in one order', async () => {
  const deps = createDeps();
  let capturedArgs: CreateOrderWithItemsArgs | undefined;

  deps.findIncentiveByCode = async (code) => {
    if (code === 'FIXED20') {
      return createIncentiveFixture({
        id: 'coupon-fixed20',
        code: 'FIXED20',
        type: 'FIXED',
        value: 20000,
      });
    }

    return createIncentiveFixture({
      id: 'coupon-spring20',
      code: 'SPRING20',
      type: 'PERCENTAGE',
      value: 20,
    });
  };
  deps.createOrderWithItems = async (args: CreateOrderWithItemsArgs) => {
    capturedArgs = args;
    return {
      id: 'o-multi',
      orderNumber: 'BK260406MULTI',
      orderItems: [],
    };
  };

  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), incentiveCodes: ['spring20', 'fixed20'] },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(capturedArgs?.discount, 60000);
  assert.equal(capturedArgs?.total, 140000);
  assert.equal(capturedArgs?.appliedIncentives?.length, 2);
  assert.equal(result.body.data?.appliedIncentives?.length, 2);
});

test('POST /api/orders dispatches order-status notification event asynchronously', async () => {
  const deps = createDeps();
  const events: Array<Record<string, unknown>> = [];
  deps.dispatchNotificationEvent = async (event) => {
    events.push(event);
  };

  const result = await handleCreateOrderRequest(buildPayload('COD'), deps);

  assert.equal(result.status, 200);
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, 'ORDER_STATUS_CHANGED');
  assert.equal(events[0].entityId, 'o1');
  assert.equal(events[0].targetEmail, 'lan@example.com');
});

test('order item with variant uses the variant price and name', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    findVariants: async () => [{ id: 'v1', productId: 'p1', name: '500g', price: 120000, stock: 5 }],
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK260405ABCD', orderItems: [] }; },
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 2, variantId: 'v1' }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 200); // create returns 200, matching the existing route
  assert.equal(captured!.orderItems[0].price, 120000);
  assert.equal(captured!.orderItems[0].name, 'Cake A - 500g');
});

test('variantId from another product is rejected', async () => {
  const deps = withDeps(createDeps(), {
    findVariants: async () => [{ id: 'v9', productId: 'OTHER', name: 'X', price: 1, stock: 5 }],
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 1, variantId: 'v9' }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 400);
});

test('item message over 200 chars is rejected', async () => {
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 1, message: 'a'.repeat(201) }] };
  const result = await handleCreateOrderRequest(payload, createDeps());
  assert.equal(result.status, 400);
});

test('guest cannot use addressId; address of another user is rejected', async () => {
  const guest = await handleCreateOrderRequest(
    { ...buildPayload('COD'), addressId: 'a1' }, createDeps());
  assert.equal(guest.status, 400);
  const other = await handleCreateOrderRequest(
    { ...buildPayload('COD'), addressId: 'a1' },
    withDeps(createDeps(), {
      getCurrentUser: async () => ({ id: 'u1' }),
      findUserAddress: async () => null,
    }));
  assert.equal(other.status, 400);
});

test('owned addressId snapshots into customerAddress and pickupDate is persisted', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getCurrentUser: async () => ({ id: 'u1' }),
    findUserAddress: async () => ({ street: '12 Nguyen Trai', ward: 'P. Ben Nghe', district: 'Quan 1', province: 'TP.HCM' }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK260405ABCD', orderItems: [] }; },
  });
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), addressId: 'a1', pickupDate: '2026-10-05' }, deps);
  assert.equal(result.status, 200);
  assert.equal(captured!.customerAddress, '12 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM');
  assert.equal(captured!.pickupDate!.getTime(), new Date('2026-10-05').getTime());
});

test('delivery order under the threshold is charged the configured fee', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  await handleCreateOrderRequest(buildPayload('COD'), deps); // payload has customerAddress
  assert.equal(captured!.deliveryFee, 30000);
  assert.equal(captured!.total, captured!.subtotal + 30000);
});

test('delivery order at/above the threshold ships free', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    // Server prices come from the DB via findProducts, not the payload —
    // make the catalog item worth 500000 so the order sits exactly at the
    // free-delivery threshold.
    findProducts: async () => [
      { id: 'p1', name: 'Cake A', price: 500000, stock: 10, categoryIds: ['cat-cake'] },
    ],
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  await handleCreateOrderRequest({ ...buildPayload('COD'), items: [{ productId: 'p1', name: 'Cake A', price: 500000, quantity: 1 }] }, deps);
  assert.equal(captured!.deliveryFee, 0);
});

test('pick-up orders never pay a delivery fee', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  const payload = buildPayload('COD');
  await handleCreateOrderRequest({ ...payload, customerAddress: undefined }, deps);
  assert.equal(captured!.deliveryFee, 0);
});

test('item message null is treated as no message instead of crashing', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 1, message: null as unknown as string }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(captured!.orderItems[0].message, null);
});

test('empty variantId is normalized to no variant instead of a dangling reference', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    findVariants: async () => [],
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 1, variantId: '' }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(captured!.orderItems[0].variantId, null);
  assert.equal(captured!.orderItems[0].price, 100000);
  assert.equal(captured!.orderItems[0].name, 'Cake A');
});

test('out-of-stock variant is rejected as unavailable', async () => {
  const deps = withDeps(createDeps(), {
    findVariants: async () => [{ id: 'v1', productId: 'p1', name: '500g', price: 120000, stock: 0 }],
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 2, variantId: 'v1' }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Variant "Cake A" is not available');
});

test('deliveryMethod pickup with a saved address is never charged the delivery fee', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), deliveryMethod: 'pickup' }, deps);
  assert.equal(result.status, 200);
  assert.equal(captured!.deliveryFee, 0);
  assert.equal(captured!.total, captured!.subtotal);
});

test('deliveryMethod delivery applies the configured fee to the charged total', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), deliveryMethod: 'delivery' }, deps);
  assert.equal(result.status, 200);
  assert.equal(captured!.deliveryFee, 30000);
  assert.equal(captured!.total, captured!.subtotal + 30000);
});

test('invalid deliveryMethod value is rejected', async () => {
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), deliveryMethod: 'drone' }, createDeps());
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Invalid delivery method');
});
