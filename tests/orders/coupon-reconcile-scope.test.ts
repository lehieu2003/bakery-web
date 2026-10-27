import test from 'node:test';
import assert from 'node:assert/strict';
import { staleCouponReservationsQuery } from '@/lib/incentives/redemption-lifecycle';
import { reconcileToken } from '@/app/api/incentives/reconcile/route';

test('stale release only touches abandoned online payments and cancelled orders', () => {
  const threshold = new Date('2026-10-27T12:00:00.000Z');

  const query = staleCouponReservationsQuery(threshold, 50);

  // COD and bank transfer orders wait for an admin; their reservation must
  // stay until the order is confirmed (commit) or cancelled (release).
  assert.deepEqual(query.where, {
    state: 'RESERVED',
    reservedAt: { lt: threshold },
    OR: [
      { order: { status: 'PENDING', paymentMethod: { in: ['MOMO', 'VNPAY'] } } },
      { order: { status: 'CANCELLED' } },
    ],
  });
  assert.equal(query.take, 50);
  assert.deepEqual(query.orderBy, { reservedAt: 'asc' });
});

test('reconcile accepts the Vercel Cron secret when no dedicated token is set', () => {
  assert.equal(reconcileToken({ INCENTIVES_RECONCILE_TOKEN: ' own ', CRON_SECRET: 'cron' }), 'own');
  assert.equal(reconcileToken({ CRON_SECRET: 'cron' }), 'cron');
  assert.equal(reconcileToken({ INCENTIVES_RECONCILE_TOKEN: '  ' }), null);
});
