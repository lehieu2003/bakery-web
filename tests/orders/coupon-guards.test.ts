import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCENTIVE_PER_USER_LIMIT_REACHED,
  releaseCouponRedemptionByOrderId,
  reserveCouponRedemption,
} from '@/lib/incentives/redemption-lifecycle';
import { incentiveFailureMessage } from '@/lib/incentives/policy';
import { normalizeVnPhone } from '@/lib/orders/customer-contact';

function reserveTx(existingUsage: number) {
  const counts: unknown[] = [];
  const created: unknown[] = [];
  const tx = {
    couponRedemption: {
      count: async (args: unknown) => {
        counts.push(args);
        return existingUsage;
      },
      create: async (args: unknown) => {
        created.push(args);
      },
    },
    coupon: { updateMany: async () => ({ count: 1 }) },
  };
  return { tx: tx as never, counts, created };
}

const reserveArgs = {
  couponId: 'c1',
  couponCode: 'WELCOME',
  usageLimit: null,
  perUserLimit: 1,
  orderId: 'o2',
  reservedDiscount: 10000,
};

test('a guest cannot reuse a once-per-customer coupon with the same phone', async () => {
  const { tx, counts, created } = reserveTx(1);

  await assert.rejects(
    reserveCouponRedemption({ ...reserveArgs, tx, userId: null, customerPhone: '0901234567' }),
    new Error(INCENTIVE_PER_USER_LIMIT_REACHED),
  );
  assert.deepEqual(counts, [
    {
      where: {
        couponId: 'c1',
        state: { in: ['RESERVED', 'COMMITTED'] },
        order: { customerPhone: '0901234567' },
      },
    },
  ]);
  assert.deepEqual(created, []);
});

test('a guest within the per-customer limit can reserve the coupon', async () => {
  const { tx, created } = reserveTx(0);

  await reserveCouponRedemption({ ...reserveArgs, tx, userId: null, customerPhone: '0901234567' });

  assert.equal(created.length, 1);
});

test('releasing a reservation twice gives the usage slot back only once', async () => {
  const couponUpdates: unknown[] = [];
  const tx = {
    couponRedemption: {
      findMany: async () => [
        { id: 'r1', state: 'RESERVED', coupon: { id: 'c1', usageLimit: 5 } },
      ],
      // The concurrent releaser already flipped the row: nothing matches.
      updateMany: async () => ({ count: 0 }),
    },
    coupon: {
      update: async (args: unknown) => {
        couponUpdates.push(args);
      },
    },
  };

  const result = await releaseCouponRedemptionByOrderId('o1', 'ORDER_CANCELLED', tx as never);

  assert.equal(result, 'NOOP_RELEASED');
  assert.deepEqual(couponUpdates, []);
});

test('a released reservation gives exactly one usage slot back', async () => {
  const redemptionUpdates: unknown[] = [];
  const couponUpdates: unknown[] = [];
  const tx = {
    couponRedemption: {
      findMany: async () => [
        { id: 'r1', state: 'RESERVED', coupon: { id: 'c1', usageLimit: 5 } },
      ],
      updateMany: async (args: unknown) => {
        redemptionUpdates.push(args);
        return { count: 1 };
      },
    },
    coupon: {
      update: async (args: unknown) => {
        couponUpdates.push(args);
      },
    },
  };

  const result = await releaseCouponRedemptionByOrderId('o1', 'ORDER_CANCELLED', tx as never);

  assert.equal(result, 'RELEASED');
  assert.deepEqual(
    (redemptionUpdates[0] as { where: unknown }).where,
    { id: 'r1', state: 'RESERVED' },
  );
  assert.deepEqual(couponUpdates, [
    { where: { id: 'c1' }, data: { usageLimit: { increment: 1 } } },
  ]);
});

test('non-public coupon failures read like an unknown code', () => {
  const generic = 'Incentive code "VIP50" is invalid or inactive.';
  for (const reasonCode of ['NOT_ASSIGNED', 'NOT_ACTIVE_YET', 'EXPIRED', 'INVALID_OR_INACTIVE'] as const) {
    assert.equal(
      incentiveFailureMessage(
        { code: 'VIP50', sourceType: 'TARGETED' },
        { ok: false, reasonCode, message: 'specific' },
      ),
      generic,
    );
  }
});

test('public coupon failures keep their specific message', () => {
  assert.equal(
    incentiveFailureMessage(
      { code: 'SALE', sourceType: 'PUBLIC' },
      { ok: false, reasonCode: 'EXPIRED', message: 'Incentive code "SALE" has expired.' },
    ),
    'Incentive code "SALE" has expired.',
  );
});

test('VN phone numbers normalize to one stored form', () => {
  assert.equal(normalizeVnPhone('090 123.45-67'), '0901234567');
  assert.equal(normalizeVnPhone('+84901234567'), '0901234567');
});
