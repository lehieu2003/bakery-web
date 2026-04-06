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

function createDeps(
  incentives: Awaited<ReturnType<GetAvailableIncentivesDeps['listIncentives']>>,
): GetAvailableIncentivesDeps {
  return {
    listIncentives: async () => incentives,
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
      {
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        minOrder: null,
        maxDiscount: null,
        usageLimit: null,
        startAt: new Date('2026-01-01T00:00:00.000Z'),
        endAt: new Date('2026-12-31T23:59:59.000Z'),
        isActive: true,
      },
      {
        code: 'MIN300',
        type: 'FIXED',
        value: 30000,
        minOrder: 300000,
        maxDiscount: null,
        usageLimit: 10,
        startAt: new Date('2026-01-01T00:00:00.000Z'),
        endAt: new Date('2026-12-31T23:59:59.000Z'),
        isActive: true,
      },
      {
        code: 'USEDUP',
        type: 'FIXED',
        value: 10000,
        minOrder: null,
        maxDiscount: null,
        usageLimit: 0,
        startAt: new Date('2026-01-01T00:00:00.000Z'),
        endAt: new Date('2026-12-31T23:59:59.000Z'),
        isActive: true,
      },
      {
        code: 'INACTIVE',
        type: 'FIXED',
        value: 10000,
        minOrder: null,
        maxDiscount: null,
        usageLimit: 5,
        startAt: new Date('2026-01-01T00:00:00.000Z'),
        endAt: new Date('2026-12-31T23:59:59.000Z'),
        isActive: false,
      },
      {
        code: 'EXPIRED',
        type: 'FIXED',
        value: 10000,
        minOrder: null,
        maxDiscount: null,
        usageLimit: 5,
        startAt: new Date('2026-01-01T00:00:00.000Z'),
        endAt: new Date('2026-03-01T00:00:00.000Z'),
        isActive: true,
      },
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
      {
        code: 'MIN300',
        type: 'FIXED',
        value: 30000,
        minOrder: 300000,
        maxDiscount: null,
        usageLimit: 2,
        startAt: new Date('2026-01-01T00:00:00.000Z'),
        endAt: new Date('2026-12-31T23:59:59.000Z'),
        isActive: true,
      },
    ]),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.incentives.length, 1);
  assert.equal(result.body.data?.incentives[0].code, 'MIN300');
  assert.equal(result.body.data?.incentives[0].minOrder, 300000);
});
