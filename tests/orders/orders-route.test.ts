import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCreateOrderRequest } from '@/app/api/orders/route';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

function createDeps() {
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


