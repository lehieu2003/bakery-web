import test from 'node:test';
import assert from 'node:assert/strict';
import { orderService, type CreateOrderPayload } from '@/services/order.service';
import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

const createPayload: CreateOrderPayload = {
  customerName: 'Lan',
  customerPhone: '0909123456',
  customerEmail: 'lan@example.com',
  customerAddress: '123 Bakery St',
  paymentMethod: 'COD',
  incentiveCode: 'WELCOME10',
  items: [
    {
      productId: 'p1',
      name: 'Cake',
      price: 100000,
      quantity: 1,
    },
  ],
};

test('orderService.createOrder posts to orders endpoint and returns data payload', async () => {
  const originalPost = http.post;
  let capturedUrl = '';
  let capturedPayload: unknown = null;
  let capturedConfig: unknown = null;

  (http as { post: typeof http.post }).post = async (url, payload, config) => {
    capturedUrl = url;
    capturedPayload = payload;
    capturedConfig = config;
    return {
      success: true,
      data: {
        order: { id: 'o1', orderNumber: 'BK123' },
        paymentUrl: null,
        appliedIncentive: {
          code: 'WELCOME10',
          type: 'PERCENTAGE',
          discount: 10000,
        },
      } as never,
    };
  };

  try {
    const result = await orderService.createOrder(createPayload);
    assert.equal(capturedUrl, ENDPOINTS.ORDERS);
    assert.deepEqual(capturedPayload, createPayload);
    assert.deepEqual(capturedConfig, { showErrorToast: false });
    assert.equal(result.paymentUrl, null);
    assert.equal(result.order.orderNumber, 'BK123');
    assert.equal(result.appliedIncentive?.code, 'WELCOME10');
  } finally {
    (http as { post: typeof http.post }).post = originalPost;
  }
});
