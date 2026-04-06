import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetAvailableIncentivesRequest } from '@/app/api/incentives/available/route';

type GetAvailableIncentivesDeps = NonNullable<
  Parameters<typeof handleGetAvailableIncentivesRequest>[1]
>;

function createRequest(query?: string) {
  return {
    nextUrl: {
      searchParams: new URLSearchParams(query ?? ''),
    },
  } as never;
}

function createIncentive(
  overrides: Partial<Awaited<ReturnType<GetAvailableIncentivesDeps['listIncentives']>>[number]> = {},
): Awaited<ReturnType<GetAvailableIncentivesDeps['listIncentives']>>[number] {
  return {
    id: 'coupon-default',
    code: 'WELCOME10',
    sourceType: 'PUBLIC',
    type: 'PERCENTAGE',
    value: 10,
    minOrder: null,
    maxDiscount: null,
    usageLimit: null,
    perUserLimit: null,
    scopeProductIds: [],
    scopeCategoryIds: [],
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-12-31T23:59:59.000Z'),
    isActive: true,
    assignments: [],
    ...overrides,
  };
}

function createDeps(
  incentives: Awaited<ReturnType<GetAvailableIncentivesDeps['listIncentives']>>,
): GetAvailableIncentivesDeps {
  return {
    getCurrentUser: async () => null,
    listIncentives: async () => incentives,
    findProductsByIds: async () => [],
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

test('GET /api/incentives/available rejects invalid subtotal query', async () => {
  const result = await handleGetAvailableIncentivesRequest(
    createRequest('subtotal=abc'),
    createDeps([]),
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid subtotal query parameter');
});

test('GET /api/incentives/available filters by active window, usage, and subtotal', async () => {
  const result = await handleGetAvailableIncentivesRequest(
    createRequest('subtotal=200000'),
    createDeps([
      createIncentive({ id: 'coupon-welcome', code: 'WELCOME10' }),
      createIncentive({
        id: 'coupon-min300',
        code: 'MIN300',
        type: 'FIXED',
        value: 30000,
        minOrder: 300000,
        usageLimit: 10,
      }),
      createIncentive({
        id: 'coupon-usedup',
        code: 'USEDUP',
        type: 'FIXED',
        value: 10000,
        usageLimit: 0,
      }),
      createIncentive({
        id: 'coupon-inactive',
        code: 'INACTIVE',
        type: 'FIXED',
        value: 10000,
        usageLimit: 5,
        isActive: false,
      }),
      createIncentive({
        id: 'coupon-expired',
        code: 'EXPIRED',
        type: 'FIXED',
        value: 10000,
        usageLimit: 5,
        endAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ]),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.incentives.length, 1);
  assert.equal(result.body.data?.incentives[0].code, 'WELCOME10');
});

test('GET /api/incentives/available keeps min-order incentives when subtotal is not provided', async () => {
  const result = await handleGetAvailableIncentivesRequest(
    createRequest(),
    createDeps([
      createIncentive({
        id: 'coupon-min300',
        code: 'MIN300',
        type: 'FIXED',
        value: 30000,
        minOrder: 300000,
        usageLimit: 2,
      }),
    ]),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.incentives.length, 1);
  assert.equal(result.body.data?.incentives[0].code, 'MIN300');
  assert.equal(result.body.data?.incentives[0].minOrder, 300000);
});

test('GET /api/incentives/available rejects invalid cart query', async () => {
  const result = await handleGetAvailableIncentivesRequest(
    createRequest('subtotal=100000&cart=p1:0'),
    createDeps([]),
  );
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid cart query parameter');
});test('GET /api/incentives/available reads cart quantities from cart query', async () => {
  const deps = createDeps([
    createIncentive({
      id: 'coupon-scoped',
      code: 'SCOPED',
      scopeProductIds: ['p1'],
    }),
  ]);
  let capturedProductIds: string[] | undefined;
  deps.findProductsByIds = async (productIds) => {
    capturedProductIds = productIds;
    return [
      {
        id: 'p1',
        price: 100000,
        categoryIds: ['cat-cake'],
      },
    ];
  };
  const result = await handleGetAvailableIncentivesRequest(
    createRequest('subtotal=300000&cart=p1:1,p1:2'),
    deps,
  );
  assert.equal(result.status, 200);
  assert.deepEqual(capturedProductIds, ['p1']);
  assert.equal(result.body.data?.incentives.length, 1);
  assert.equal(result.body.data?.incentives[0].code, 'SCOPED');
});
