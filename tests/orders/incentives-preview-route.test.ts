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
    findVariants: async () => [],
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
    getDeliverySettings: async () => ({
      deliveryFee: 30000,
      freeDeliveryThreshold: 500000,
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

test('POST /api/incentives/preview applies coupon alongside membership discount', async () => {
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

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.membershipDiscount, 14000);
  assert.equal(result.body.data?.couponDiscount, 10000);
  assert.equal(result.body.data?.total, 176000);
});

test('POST /api/incentives/preview supports multiple incentive codes', async () => {
  const deps = createDeps();
  deps.findIncentiveByCode = async (code) => {
    if (code === 'FIXED30') {
      return {
        id: 'coupon-fixed30',
        code: 'FIXED30',
        sourceType: 'PUBLIC',
        type: 'FIXED',
        value: 30000,
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
      };
    }

    return {
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
    };
  };

  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCodes: ['spring20', 'fixed30'],
      items: [{ productId: 'p1', quantity: 2 }],
    },
    deps,
    {} as never,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.couponDiscount, 70000);
  assert.equal(result.body.data?.total, 130000);
  assert.equal(result.body.data?.appliedIncentives?.length, 2);
});

test('preview without deliveryMethod keeps the legacy fee-less response shape', async () => {
  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCode: 'spring20',
      items: [{ productId: 'p1', quantity: 2 }],
    },
    createDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.total, 160000);
  assert.equal(result.body.data?.deliveryFee, undefined);
  // JSON.stringify drops the undefined deliveryFee key, so the wire response
  // keeps the exact legacy field set.
  const wireData = JSON.parse(JSON.stringify(result.body.data)) as Record<
    string,
    unknown
  >;
  assert.equal('deliveryFee' in wireData, false);
});

test('preview with deliveryMethod pickup reports a zero fee and no fee in the total', async () => {
  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'pickup',
      items: [{ productId: 'p1', quantity: 2 }],
    },
    createDeps(),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.data?.deliveryFee, 0);
  assert.equal(result.body.data?.total, 200000);
});

test('preview with deliveryMethod delivery includes the fee after discounts', async () => {
  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCode: 'spring20',
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 2 }],
    },
    createDeps(),
  );

  // subtotal 200000 - coupon 40000 = 160000, then + fee 30000 = 190000
  // (matches the create route's `subtotal + deliveryFee - discount`).
  assert.equal(result.status, 200);
  assert.equal(result.body.data?.deliveryFee, 30000);
  assert.equal(result.body.data?.total, 190000);
});

test('preview with deliveryMethod delivery at/above the threshold ships free', async () => {
  const deps = createDeps();
  deps.findProducts = async () => [
    { id: 'p1', name: 'Cake A', price: 500000, categoryIds: ['cat-cake'] },
  ];

  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 1 }],
    },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.data?.deliveryFee, 0);
  assert.equal(result.body.data?.total, 500000);
});

test('preview rejects invalid deliveryMethod values', async () => {
  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'drone' as never,
      items: [{ productId: 'p1', quantity: 2 }],
    },
    createDeps(),
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Invalid delivery method');
});

test('preview prices items from an owned variant and applies the fee threshold to it', async () => {
  const deps = createDeps();
  const findVariantsCalls: string[][] = [];
  deps.findVariants = async (variantIds) => {
    findVariantsCalls.push(variantIds);
    return [
      {
        id: 'v-large',
        productId: 'p1',
        name: '500g',
        price: 120000,
        stock: 10,
      },
    ];
  };

  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 2, variantId: 'v-large' }],
    },
    deps,
  );

  // Variant priced 120000 vs product base 100000: subtotal uses 120000 × 2,
  // and 240000 sits below the 500000 free-delivery threshold so the fee applies.
  assert.equal(result.status, 200);
  assert.equal(result.body.data?.subtotal, 240000);
  assert.equal(result.body.data?.deliveryFee, 30000);
  assert.equal(result.body.data?.total, 270000);
  assert.deepEqual(findVariantsCalls, [['v-large']]);
});

test('variant-priced subtotal crossing the free-delivery threshold ships free', async () => {
  const deps = createDeps();
  deps.findVariants = async () => [
    {
      id: 'v-large',
      productId: 'p1',
      name: '500g',
      price: 120000,
      stock: 10,
    },
  ];

  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 5, variantId: 'v-large' }],
    },
    deps,
  );

  // 120000 × 5 = 600000 ≥ 500000 threshold: free delivery on the variant total.
  assert.equal(result.status, 200);
  assert.equal(result.body.data?.subtotal, 600000);
  assert.equal(result.body.data?.deliveryFee, 0);
  assert.equal(result.body.data?.total, 600000);
});

test('preview applies coupon discounts on top of the variant-priced subtotal', async () => {
  const deps = createDeps();
  deps.findVariants = async () => [
    {
      id: 'v-large',
      productId: 'p1',
      name: '500g',
      price: 120000,
      stock: 10,
    },
  ];

  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCode: 'spring20',
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 2, variantId: 'v-large' }],
    },
    deps,
  );

  // subtotal 240000 - 20% coupon 48000 = 192000, then + fee 30000 = 222000
  // (matches the create route's `subtotal + deliveryFee - discount`).
  assert.equal(result.status, 200);
  assert.equal(result.body.data?.subtotal, 240000);
  assert.equal(result.body.data?.couponDiscount, 48000);
  assert.equal(result.body.data?.total, 222000);
});

test('preview falls back to the base price for a variant owned by another product', async () => {
  const deps = createDeps();
  deps.findVariants = async () => [
    {
      id: 'v-foreign',
      productId: 'p-other',
      name: 'Other cake size',
      price: 999000,
      stock: 5,
    },
  ];

  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 2, variantId: 'v-foreign' }],
    },
    deps,
  );

  // Ownership mismatch is advisory here (the create route 400s): preview
  // silently falls back to the base product price.
  assert.equal(result.status, 200);
  assert.equal(result.body.data?.subtotal, 200000);
  assert.equal(result.body.data?.deliveryFee, 30000);
  assert.equal(result.body.data?.total, 230000);
});

test('preview with an unknown variantId also falls back to the base price', async () => {
  const deps = createDeps();
  deps.findVariants = async () => [];

  const result = await handlePreviewIncentiveRequest(
    {
      deliveryMethod: 'delivery',
      items: [{ productId: 'p1', quantity: 2, variantId: 'v-missing' }],
    },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.data?.subtotal, 200000);
  assert.equal(result.body.data?.total, 230000);
});

test('preview without variantId keeps the legacy base-price path and wire shape', async () => {
  const deps = createDeps();
  let findVariantsCalled = false;
  deps.findVariants = async () => {
    findVariantsCalled = true;
    return [];
  };

  const result = await handlePreviewIncentiveRequest(
    {
      incentiveCode: 'spring20',
      items: [{ productId: 'p1', quantity: 2 }],
    },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(findVariantsCalled, false);
  assert.equal(result.body.data?.subtotal, 200000);
  assert.equal(result.body.data?.couponDiscount, 40000);
  assert.equal(result.body.data?.total, 160000);
  // Byte-identical legacy field set (JSON.stringify drops the undefined
  // deliveryFee key).
  const wireData = JSON.parse(JSON.stringify(result.body.data)) as Record<
    string,
    unknown
  >;
  assert.deepEqual(
    Object.keys(wireData).sort(),
    [
      'appliedIncentive',
      'appliedIncentives',
      'couponDiscount',
      'membershipDiscount',
      'subtotal',
      'total',
      'totalDiscount',
    ],
  );
});
