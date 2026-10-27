import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { handleExpireUnpaidOrdersRequest } from '@/app/api/cron/expire-unpaid-orders/route';

const SECRET = 'cron-secret-for-tests';

function cronRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/expire-unpaid-orders', { headers });
}

function makeDeps(
  overrides: Partial<Parameters<typeof handleExpireUnpaidOrdersRequest>[1]> = {},
) {
  const calls: Array<{ olderThanHours: number; batchSize: number }> = [];
  const deps = {
    getConfig: () => ({ token: SECRET, olderThanHours: 24, batchSize: 100 }),
    expire: async (args: { olderThanHours: number; batchSize: number }) => {
      calls.push(args);
      return { scanned: 3, cancelled: 2, threshold: new Date('2026-10-27T12:00:00.000Z') };
    },
    ...overrides,
  };
  return { deps, calls };
}

test('expire-unpaid cron is unavailable until CRON_SECRET is configured', async () => {
  const { deps, calls } = makeDeps({
    getConfig: () => ({ token: null, olderThanHours: 24, batchSize: 100 }),
  });

  const result = await handleExpireUnpaidOrdersRequest(
    cronRequest({ authorization: `Bearer ${SECRET}` }),
    deps,
  );

  assert.equal(result.status, 503);
  assert.deepEqual(calls, []);
});

test('expire-unpaid cron rejects a missing or wrong token', async () => {
  const { deps, calls } = makeDeps();

  const missing = await handleExpireUnpaidOrdersRequest(cronRequest(), deps);
  const wrong = await handleExpireUnpaidOrdersRequest(
    cronRequest({ authorization: 'Bearer nope' }),
    deps,
  );

  assert.equal(missing.status, 401);
  assert.equal(wrong.status, 403);
  assert.deepEqual(calls, []);
});

test('expire-unpaid cron runs with the Vercel Cron bearer token', async () => {
  const { deps, calls } = makeDeps();

  const result = await handleExpireUnpaidOrdersRequest(
    cronRequest({ authorization: `Bearer ${SECRET}` }),
    deps,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(calls, [{ olderThanHours: 24, batchSize: 100 }]);
  assert.deepEqual(result.body, {
    success: true,
    data: { scanned: 3, cancelled: 2, threshold: '2026-10-27T12:00:00.000Z' },
  });
});

test('expire-unpaid cron also accepts the x-cron-token header', async () => {
  const { deps } = makeDeps();

  const result = await handleExpireUnpaidOrdersRequest(
    cronRequest({ 'x-cron-token': SECRET }),
    deps,
  );

  assert.equal(result.status, 200);
});
