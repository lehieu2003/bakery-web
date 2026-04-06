import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePreviewIncentiveRequest } from '@/app/api/incentives/preview/route';

type PreviewDeps = NonNullable<Parameters<typeof handlePreviewIncentiveRequest>[1]>;

function createDeps(): PreviewDeps {
  return {
    getCurrentUser: async () => null,
    findProducts: async () => [
      {
        id: 'p1',
        name: 'Cake A',
        price: 100000,
        categoryIds: ['cat-cake'],
      },
    ],
    findIncentiveByCode: async () => ({
      id: 'coupon-spring20',
      code: 'SPRING20',
      sourceType: 'PUBLIC',
      type: 'PERCENTAGE',
      value: 20,
      minOrder: null,
      maxDiscount: null,
      usageLimit: null,
      perUserLimit: null,
      scopeProductIds: [],
      scopeCategoryIds: [],
      startAt: new Date('2026-04-01T00:00:00.000Z'),
      endAt: new Date('2026-04-30T23:59:59.000Z'),
      isActive: true,
      assignments: [],
    }),
    countUserCommittedIncentiveUsage: async () => 0,
    getMembershipConfig: async () => ({
      pointsPerOrder: 10000,
      levels: [
        { level: 'SILVER', label: 'Silver', minPoints: 0, discountPercent: 3 },
        { level: 'GOLD', label: 'Gold', minPoints: 300, discountPercent: 7 },
        {
          level: 'PLATINUM',
          label: 'Platinum',
          minPoints: 900,
          discountPercent: 12,
        },
      ],
    }),
    now: () => new Date('2026-04-06T12:00:00.000Z'),
  };
}

test('POST /api/incentives/preview rejects missing required fields', async () => {
  const result = await handlePreviewIncentiveRequest({}, createDeps());

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Missing required fields');
});

test('POST /api/incentives/preview returns recalculated total and coupon discount', async () => {
  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCode: 'spring20',
      items: [{ productId: 'p1', quantity: 2 }],
    },
    createDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.subtotal, 200000);
  assert.equal(result.body.data?.couponDiscount, 40000);
  assert.equal(result.body.data?.total, 160000);
  assert.equal(result.body.data?.appliedIncentive?.code, 'SPRING20');
});

test('POST /api/incentives/preview rejects coupon when membership benefit is stronger', async () => {
  const deps = createDeps();
  deps.getCurrentUser = async () => ({
    id: 'u-gold',
    memberLevel: 'GOLD',
  });
  deps.findIncentiveByCode = async () => ({
    id: 'coupon-weak',
    code: 'WEAK5',
    sourceType: 'PUBLIC',
    type: 'PERCENTAGE',
    value: 5,
    minOrder: null,
    maxDiscount: null,
    usageLimit: null,
    perUserLimit: null,
    scopeProductIds: [],
    scopeCategoryIds: [],
    startAt: new Date('2026-04-01T00:00:00.000Z'),
    endAt: new Date('2026-04-30T23:59:59.000Z'),
    isActive: true,
    assignments: [],
  });

  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCode: 'weak5',
      items: [{ productId: 'p1', quantity: 2 }],
    },
    deps,
    {} as never,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(
    result.body.error,
    'Incentive code "WEAK5" conflicts with your current membership benefit. Remove the code or increase cart value.',
  );
});


