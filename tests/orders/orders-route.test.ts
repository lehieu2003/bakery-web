import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleCreateOrderRequest,
  handleGetOrdersRequest,
} from '@/app/api/orders/route';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type CreateOrderDeps = NonNullable<
  Parameters<typeof handleCreateOrderRequest>[1]
>;
type CreateOrderWithItemsArgs = Parameters<
  CreateOrderDeps['createOrderWithItems']
>[0];

function createDeps(): CreateOrderDeps {
  const order = {
    id: 'o1',
    orderNumber: 'BK260405ABCD',
    orderItems: [],
  };

  return {
    getCurrentUser: async () => null,
    findProducts: async () => [
      { id: 'p1', name: 'Cake A', price: 100000, stock: 10 },
    ],
    createOrderWithItems: async () => order,
    createPaymentRecord: async () => undefined,
    createMoMoPayment: async () => ({ payUrl: 'https://pay.example/momo' }),
    createZaloPayPayment: async () => ({ payUrl: 'https://pay.example/zalo' }),
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
  };
}

function buildPayload(method: 'COD' | 'MOMO' | 'ZALOPAY' | 'BANK_TRANSFER') {
  return {
    customerName: 'Lan',
    customerPhone: '0909123456',
    customerEmail: 'lan@example.com',
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

test('POST /api/orders returns paymentError for ZALOPAY gateway failures', async () => {
  const deps = createDeps();
  deps.createZaloPayPayment = async () =>
    ({ error: 'gateway unavailable' }) as never;

  const result = await handleCreateOrderRequest(buildPayload('ZALOPAY'), deps);

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
