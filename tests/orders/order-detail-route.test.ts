import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetOrderRequest } from '@/app/api/orders/[orderNumber]/route';

const ownedOrder = {
  id: 'o1',
  orderNumber: 'BK260930TEST',
  userId: 'u1',
  customerName: 'Lan',
  customerPhone: '0909123456',
  customerEmail: 'lan@example.com',
  customerAddress: '123 Nguyen Trai',
  pickupDate: new Date('2026-10-05T00:00:00.000Z'),
  status: 'CONFIRMED' as const,
  subtotal: '200000',
  deliveryFee: '30000',
  discount: '10000',
  total: '220000',
  paymentMethod: 'COD' as const,
  createdAt: new Date('2026-09-30T10:00:00.000Z'),
  updatedAt: new Date('2026-09-30T10:00:00.000Z'),
  orderItems: [
    {
      id: 'oi1',
      orderId: 'o1',
      productId: 'p1',
      variantId: 'v1',
      name: 'Cake A',
      message: 'Happy Birthday',
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
  payment: null,
};

function createDeps() {
  return {
    getCurrentUser: async () => ({ id: 'u1' }),
    findOrderForUser: async (orderNumber: string, userId: string) =>
      orderNumber === 'BK260930TEST' && userId === 'u1' ? ownedOrder : null,
  };
}

test('GET /api/orders/[orderNumber] requires a session', async () => {
  const result = await handleGetOrderRequest({} as never, { orderNumber: 'BK260930TEST' }, {
    ...createDeps(),
    getCurrentUser: async () => null,
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test("GET another user's order returns 404 without leaking data", async () => {
  const result = await handleGetOrderRequest({} as never, { orderNumber: 'BK-OTHER' }, {
    ...createDeps(),
    getCurrentUser: async () => ({ id: 'u2' }),
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Order not found');
});

test('GET own order returns the serialized order envelope', async () => {
  const result = await handleGetOrderRequest({} as never, { orderNumber: 'BK260930TEST' }, createDeps());

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const order = (result.body.data as { order: Record<string, unknown> }).order;
  assert.equal(order.orderNumber, 'BK260930TEST');
  assert.equal(order.status, 'CONFIRMED');
  assert.equal(order.deliveryFee, 30000);
  assert.equal(order.total, 220000);
  assert.equal(order.pickupDate, '2026-10-05T00:00:00.000Z');
  const items = order.orderItems as Array<Record<string, unknown>>;
  assert.equal(items[0].name, 'Cake A');
  assert.equal(items[0].message, 'Happy Birthday');
});
