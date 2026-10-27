import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expiredBankTransferOrdersQuery,
  expireUnpaidBankTransferOrders,
} from '@/lib/orders/expire-unpaid';
import { cancelOrderAndRestoreStock } from '@/lib/orders/stock';

const NOW = new Date('2026-10-28T12:00:00.000Z');

test('only pending bank transfer orders older than the TTL are selected, oldest first', () => {
  const threshold = new Date('2026-10-27T12:00:00.000Z');

  const query = expiredBankTransferOrdersQuery(threshold, 50);

  assert.deepEqual(query.where, {
    status: 'PENDING',
    paymentMethod: 'BANK_TRANSFER',
    createdAt: { lt: threshold },
  });
  assert.deepEqual(query.orderBy, { createdAt: 'asc' });
  assert.equal(query.take, 50);
});

test('expire cancels each expired order and reports the threshold', async () => {
  const seen: { threshold?: Date; batchSize?: number } = {};
  const cancelled: string[] = [];

  const result = await expireUnpaidBankTransferOrders(
    { olderThanHours: 24, batchSize: 100, now: () => NOW },
    {
      findExpiredOrderIds: async (threshold, batchSize) => {
        seen.threshold = threshold;
        seen.batchSize = batchSize;
        return ['o1', 'o2'];
      },
      cancelExpiredOrder: async (orderId) => {
        cancelled.push(orderId);
        return true;
      },
    },
  );

  assert.equal(seen.threshold?.toISOString(), '2026-10-27T12:00:00.000Z');
  assert.equal(seen.batchSize, 100);
  assert.deepEqual(cancelled, ['o1', 'o2']);
  assert.deepEqual(result, { scanned: 2, cancelled: 2, threshold: seen.threshold });
});

test('an order confirmed meanwhile is not counted as cancelled', async () => {
  const result = await expireUnpaidBankTransferOrders(
    { olderThanHours: 24, batchSize: 100, now: () => NOW },
    {
      findExpiredOrderIds: async () => ['o1', 'o2'],
      cancelExpiredOrder: async (orderId) => orderId === 'o2',
    },
  );

  assert.equal(result.scanned, 2);
  assert.equal(result.cancelled, 1);
});

test('one failing order does not stop the rest of the batch', async () => {
  const cancelled: string[] = [];
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await expireUnpaidBankTransferOrders(
      { olderThanHours: 24, batchSize: 100, now: () => NOW },
      {
        findExpiredOrderIds: async () => ['o1', 'o2'],
        cancelExpiredOrder: async (orderId) => {
          if (orderId === 'o1') throw new Error('deadlock');
          cancelled.push(orderId);
          return true;
        },
      },
    );
    assert.deepEqual(cancelled, ['o2']);
    assert.equal(result.cancelled, 1);
  } finally {
    console.error = originalError;
  }
});

test('cancelOrderAndRestoreStock with onlyIfStatus leaves an order that moved on untouched', async () => {
  const updates: unknown[] = [];
  const tx = {
    order: {
      updateMany: async (args: unknown) => {
        updates.push(args);
        return { count: 0 };
      },
    },
    orderItem: {
      findMany: async () => {
        throw new Error('stock must not be restored');
      },
    },
  };

  const result = await cancelOrderAndRestoreStock(tx as never, 'o1', {
    onlyIfStatus: 'PENDING',
  });

  assert.equal(result, false);
  assert.deepEqual(updates, [
    { where: { id: 'o1', status: 'PENDING' }, data: { status: 'CANCELLED' } },
  ]);
});
