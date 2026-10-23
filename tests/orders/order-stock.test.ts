import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUT_OF_STOCK,
  cancelOrderAndRestoreStock,
  confirmOrderUnlessCancelled,
  decrementStock,
} from '@/lib/orders/stock';

type Call = { model: string; args: unknown };

/** Records every write; updateMany answers with the queued counts. */
function createFakeTx(options: {
  orderUpdateCounts?: number[];
  stockUpdateCount?: number;
  items?: Array<{ productId: string; variantId: string | null; quantity: number }>;
} = {}) {
  const calls: Call[] = [];
  const orderCounts = [...(options.orderUpdateCounts ?? [])];
  const record = (model: string) => ({
    updateMany: async (args: unknown) => {
      calls.push({ model, args });
      if (model === 'order') return { count: orderCounts.shift() ?? 0 };
      return { count: options.stockUpdateCount ?? 1 };
    },
  });
  const tx = {
    order: record('order'),
    product: record('product'),
    productVariant: record('productVariant'),
    orderItem: { findMany: async () => options.items ?? [] },
  };
  return { tx: tx as never, calls };
}

test('enforced decrement only applies while enough stock is left', async () => {
  const { tx, calls } = createFakeTx();
  await decrementStock(tx, [
    { kind: 'product', id: 'p1', quantity: 3, enforce: true },
    { kind: 'variant', id: 'v1', quantity: 3, enforce: false },
  ]);
  assert.deepEqual(calls, [
    { model: 'product', args: { where: { id: 'p1', stock: { gte: 3 } }, data: { stock: { decrement: 3 } } } },
    { model: 'productVariant', args: { where: { id: 'v1' }, data: { stock: { decrement: 3 } } } },
  ]);
});

test('a decrement that matches no row aborts the order as out of stock', async () => {
  const { tx } = createFakeTx({ stockUpdateCount: 0 });
  await assert.rejects(
    decrementStock(tx, [{ kind: 'product', id: 'p1', quantity: 1, enforce: true }]),
    new Error(OUT_OF_STOCK),
  );
});

test('cancelling restores summed product and variant stock', async () => {
  const { tx, calls } = createFakeTx({
    orderUpdateCounts: [1],
    items: [
      { productId: 'p1', variantId: 'v1', quantity: 2 },
      { productId: 'p1', variantId: null, quantity: 1 },
      { productId: 'p2', variantId: null, quantity: 4 },
    ],
  });
  assert.equal(await cancelOrderAndRestoreStock(tx, 'o1'), true);
  assert.deepEqual(calls, [
    { model: 'order', args: { where: { id: 'o1', status: { not: 'CANCELLED' } }, data: { status: 'CANCELLED' } } },
    { model: 'product', args: { where: { id: 'p1' }, data: { stock: { increment: 3 } } } },
    { model: 'product', args: { where: { id: 'p2' }, data: { stock: { increment: 4 } } } },
    { model: 'productVariant', args: { where: { id: 'v1' }, data: { stock: { increment: 2 } } } },
  ]);
});

test('an already-cancelled order restores nothing (no double restock)', async () => {
  const { tx, calls } = createFakeTx({
    orderUpdateCounts: [0],
    items: [{ productId: 'p1', variantId: null, quantity: 2 }],
  });
  assert.equal(await cancelOrderAndRestoreStock(tx, 'o1'), false);
  assert.deepEqual(calls.map((c) => c.model), ['order']);
});

test('a cancelled order is never confirmed by a late payment', async () => {
  const { tx, calls } = createFakeTx({ orderUpdateCounts: [0, 1] });
  assert.equal(await confirmOrderUnlessCancelled(tx, 'o1'), false);
  assert.equal(await confirmOrderUnlessCancelled(tx, 'o2'), true);
  assert.deepEqual(calls[0], {
    model: 'order',
    args: { where: { id: 'o1', status: { not: 'CANCELLED' } }, data: { status: 'CONFIRMED' } },
  });
});
