import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handlePrepareReorderRequest,
  POST as postPrepareReorder,
} from '@/app/api/orders/reorder/route';

type PrepareReorderDeps = NonNullable<
  Parameters<typeof handlePrepareReorderRequest>[2]
>;

function createDeps(
  order: Awaited<ReturnType<PrepareReorderDeps['findOrderByIdForUser']>>,
): PrepareReorderDeps {
  return {
    getCurrentUser: async () => ({ id: 'u1' }),
    findOrderByIdForUser: async () => order,
  };
}

test('POST /api/orders/reorder prepares cart items and surfaces unavailable guidance', async () => {
  const result = await handlePrepareReorderRequest(
    { orderId: 'o-completed' },
    {} as never,
    createDeps({
      id: 'o-completed',
      orderNumber: 'BK260406DONE',
      status: 'COMPLETED',
      orderItems: [
        {
          productId: 'p1',
          variantId: null,
          name: 'Chocolate Cake',
          quantity: 2,
          product: {
            id: 'p1',
            name: 'Chocolate Cake',
            price: 90000,
            stock: 10,
            isActive: true,
            images: [{ url: '/images/chocolate.jpg' }],
            categories: [{ category: { slug: 'cakes' } }],
          },
          variant: null,
        },
        {
          productId: 'p2',
          variantId: null,
          name: 'Seasonal Tart',
          quantity: 1,
          product: {
            id: 'p2',
            name: 'Seasonal Tart',
            price: 120000,
            stock: 5,
            isActive: false,
            images: [{ url: '/images/tart.jpg' }],
            categories: [{ category: { slug: 'cakes' } }],
          },
          variant: null,
        },
        {
          productId: 'p3',
          variantId: 'v3',
          name: 'Baking Mix',
          quantity: 3,
          product: {
            id: 'p3',
            name: 'Baking Mix',
            price: 50000,
            stock: 20,
            isActive: true,
            images: [{ url: '/images/mix.jpg' }],
            categories: [{ category: { slug: 'ingredients' } }],
          },
          variant: {
            id: 'v3',
            productId: 'p3',
            name: 'Large Pack',
            price: 55000,
            stock: 1,
          },
        },
      ],
    }),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.items.length, 2);
  assert.deepEqual(result.body.data?.items[0], {
    productId: 'p1',
    variantId: null,
    name: 'Chocolate Cake',
    variantName: null,
    price: 90000,
    quantity: 2,
    image: '/images/chocolate.jpg',
    type: 'cake',
  });
  assert.deepEqual(result.body.data?.items[1], {
    productId: 'p3',
    variantId: 'v3',
    name: 'Baking Mix',
    variantName: 'Large Pack',
    price: 55000,
    quantity: 1,
    image: '/images/mix.jpg',
    type: 'ingredient',
  });

  assert.equal(result.body.data?.unavailableItems.length, 2);
  assert.equal(
    result.body.data?.unavailableItems[0].reason,
    'PRODUCT_UNAVAILABLE',
  );
  assert.equal(
    result.body.data?.unavailableItems[1].reason,
    'INSUFFICIENT_STOCK',
  );
  assert.match(
    result.body.data?.unavailableItems[1].guidance ?? '',
    /only has 1 item\(s\) available/i,
  );
});

test('POST /api/orders/reorder rejects non-completed orders', async () => {
  const result = await handlePrepareReorderRequest(
    { orderId: 'o-confirmed' },
    {} as never,
    createDeps({
      id: 'o-confirmed',
      orderNumber: 'BK260406WAIT',
      status: 'CONFIRMED',
      orderItems: [],
    }),
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(
    result.body.error,
    'Reorder is available for completed orders only.',
  );
});

test('POST /api/orders/reorder rejects missing orderId', async () => {
  const result = await handlePrepareReorderRequest(
    {},
    {} as never,
    createDeps(null),
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'orderId is required');
});

test('POST /api/orders/reorder returns 404 when order is not found', async () => {
  const result = await handlePrepareReorderRequest(
    { orderId: 'missing-order' },
    {} as never,
    createDeps(null),
  );

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Order not found');
});

test('POST /api/orders/reorder returns 401 when unauthenticated', async () => {
  const result = await handlePrepareReorderRequest(
    { orderId: 'o-any' },
    {} as never,
    {
      getCurrentUser: async () => null,
      findOrderByIdForUser: async () => null,
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('POST /api/orders/reorder returns 400 when request body is invalid JSON', async () => {
  const response = await postPrepareReorder({
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
  } as never);

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Invalid request payload');
});
