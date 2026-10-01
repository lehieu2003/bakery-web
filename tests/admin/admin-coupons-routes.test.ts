import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleAdminCouponsGetRequest,
  handleAdminCouponsPostRequest,
} from '@/app/api/admin/coupons/route';
import {
  handleAdminCouponPutRequest,
  handleAdminCouponDeleteRequest,
} from '@/app/api/admin/coupons/[id]/route';

const admin = { id: 'admin-1', role: 'ADMIN' as const };

function baseDeps(overrides: Record<string, unknown> = {}) {
  return {
    requireAdmin: async () => admin,
    findCoupons: async () => [],
    createCoupon: async (payload: Record<string, unknown>) => ({
      id: 'c-new',
      ...payload,
    }),
    findCouponById: async () => null,
    updateCouponById: async (_id: string, payload: Record<string, unknown>) => ({
      id: 'c1',
      ...payload,
    }),
    countRedemptions: async () => 0,
    deleteCouponById: async () => undefined,
    writeAdminAudit: async () => undefined,
    ...overrides,
  };
}

function validPayload() {
  return {
    code: '  save10  ',
    type: 'PERCENTAGE',
    value: 10,
    minOrder: 100000,
    maxDiscount: 50000,
    startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-10-31T23:59:59.000Z',
    usageLimit: 100,
    perUserLimit: 1,
  };
}

test('GET list requires admin and returns coupons envelope', async () => {
  let adminChecked = false;
  const result = await handleAdminCouponsGetRequest({} as never, {
    ...baseDeps({
      requireAdmin: async () => {
        adminChecked = true;
        return admin;
      },
      findCoupons: async () => [
        { id: 'c1', code: 'SAVE10', type: 'PERCENTAGE', value: '10', isActive: true },
      ],
    }),
  } as never);

  assert.equal(adminChecked, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as { coupons: unknown[] };
  assert.equal(data.coupons.length, 1);
});

test('POST normalizes the code to uppercase and audits the create', async () => {
  const seen: Array<Record<string, unknown>> = [];
  const audits: string[] = [];
  const result = await handleAdminCouponsPostRequest(
    { json: async () => validPayload(), headers: new Headers() } as never,
    baseDeps({
      createCoupon: async (payload: Record<string, unknown>) => {
        seen.push(payload);
        return { id: 'c-new', ...payload };
      },
      writeAdminAudit: async (payload: { mutationType: string }) => {
        audits.push(payload.mutationType);
      },
    }) as never,
  );

  assert.equal(result.status, 200);
  assert.equal(seen[0].code, 'SAVE10'); // trimmed + uppercased
  assert.deepEqual(audits, ['CREATE']);
});

test('POST rejects PERCENTAGE values over 100', async () => {
  const result = await handleAdminCouponsPostRequest(
    { json: async () => ({ ...validPayload(), value: 150 }), headers: new Headers() } as never,
    baseDeps() as never,
  );
  assert.equal(result.status, 400);
});

test('POST rejects endAt before startAt', async () => {
  const result = await handleAdminCouponsPostRequest(
    {
      json: async () => ({
        ...validPayload(),
        endAt: '2026-09-01T00:00:00.000Z',
      }),
      headers: new Headers(),
    } as never,
    baseDeps() as never,
  );
  assert.equal(result.status, 400);
});

test('POST maps a duplicate code (P2002) to 400', async () => {
  const result = await handleAdminCouponsPostRequest(
    { json: async () => validPayload(), headers: new Headers() } as never,
    baseDeps({
      createCoupon: async () => {
        const error = new Error('Unique constraint failed');
        (error as { code?: string }).code = 'P2002';
        throw error;
      },
    }) as never,
  );
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Coupon code already exists');
});

test('PUT toggles isActive and audits the update', async () => {
  const audits: string[] = [];
  const result = await handleAdminCouponPutRequest(
    {
      json: async () => ({ isActive: false }),
      headers: new Headers(),
    } as never,
    { id: 'c1' },
    baseDeps({
      findCouponById: async () => ({ id: 'c1', code: 'SAVE10' }),
      writeAdminAudit: async (payload: { mutationType: string }) => {
        audits.push(payload.mutationType);
      },
    }) as never,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(audits, ['UPDATE']);
});

test('PUT rejects an unknown coupon with 404', async () => {
  const result = await handleAdminCouponPutRequest(
    { json: async () => ({ isActive: false }), headers: new Headers() } as never,
    { id: 'nope' },
    baseDeps({ findCouponById: async () => null }) as never,
  );
  assert.equal(result.status, 404);
});

test('DELETE returns 409 when the coupon has redemptions', async () => {
  const result = await handleAdminCouponDeleteRequest(
    { headers: new Headers() } as never,
    { id: 'c-used' },
    baseDeps({
      findCouponById: async () => ({ id: 'c-used', code: 'USED10' }),
      countRedemptions: async () => 3,
    }) as never,
  );
  assert.equal(result.status, 409);
});

test('DELETE removes a coupon without redemptions and audits it', async () => {
  let deleted = false;
  const audits: string[] = [];
  const result = await handleAdminCouponDeleteRequest(
    { headers: new Headers() } as never,
    { id: 'c-unused' },
    baseDeps({
      findCouponById: async () => ({ id: 'c-unused', code: 'FRESH10' }),
      deleteCouponById: async () => {
        deleted = true;
      },
      writeAdminAudit: async (payload: { mutationType: string }) => {
        audits.push(payload.mutationType);
      },
    }) as never,
  );

  assert.equal(result.status, 200);
  assert.equal(deleted, true);
  assert.deepEqual(audits, ['DELETE']);
});
