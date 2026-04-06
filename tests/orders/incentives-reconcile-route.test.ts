import test from 'node:test';
import assert from 'node:assert/strict';
import { handleIncentivesReconcileRequest } from '@/app/api/incentives/reconcile/route';

type ReconcileDeps = NonNullable<
  Parameters<typeof handleIncentivesReconcileRequest>[1]
>;

function createDeps(): ReconcileDeps {
  return {
    getConfig: () => ({
      token: 'secret-token',
      defaultOlderThanMinutes: 30,
      defaultBatchSize: 100,
    }),
    releaseStaleReservations: async () => ({
      scanned: 3,
      released: 2,
      threshold: new Date('2026-04-06T12:00:00.000Z'),
    }),
  };
}

function createRequest(args?: {
  method?: 'GET' | 'POST';
  query?: string;
  headers?: Record<string, string>;
  body?: unknown;
}) {
  const headers = new Map<string, string>();
  for (const [key, value] of Object.entries(args?.headers ?? {})) {
    headers.set(key.toLowerCase(), value);
  }

  return {
    method: args?.method ?? 'GET',
    nextUrl: {
      searchParams: new URLSearchParams(args?.query ?? ''),
    },
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    json: async () => args?.body ?? {},
  } as never;
}

test('reconcile endpoint returns 503 when token is not configured', async () => {
  const deps = createDeps();
  deps.getConfig = () => ({
    token: null,
    defaultOlderThanMinutes: 30,
    defaultBatchSize: 100,
  });

  const result = await handleIncentivesReconcileRequest(
    createRequest({ headers: { 'x-reconcile-token': 'secret-token' } }),
    deps,
  );

  assert.equal(result.status, 503);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Reconcile token is not configured');
});

test('reconcile endpoint returns 401 when token is missing', async () => {
  const result = await handleIncentivesReconcileRequest(createRequest(), createDeps());

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('reconcile endpoint accepts bearer token and query overrides', async () => {
  const deps = createDeps();
  let capturedArgs: { olderThanMinutes: number; batchSize: number } | undefined;

  deps.releaseStaleReservations = async (args) => {
    capturedArgs = args;
    return {
      scanned: 10,
      released: 7,
      threshold: new Date('2026-04-06T11:00:00.000Z'),
    };
  };

  const result = await handleIncentivesReconcileRequest(
    createRequest({
      query: 'olderThanMinutes=45&batchSize=20',
      headers: { authorization: 'Bearer secret-token' },
    }),
    deps,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(capturedArgs, { olderThanMinutes: 45, batchSize: 20 });
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.scanned, 10);
  assert.equal(result.body.data?.released, 7);
  assert.equal(result.body.data?.threshold, '2026-04-06T11:00:00.000Z');
});

test('reconcile endpoint validates POST payload', async () => {
  const deps = createDeps();
  const result = await handleIncentivesReconcileRequest(
    createRequest({
      method: 'POST',
      headers: { 'x-reconcile-token': 'secret-token' },
      body: { olderThanMinutes: 0 },
    }),
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid reconciliation payload');
});

test('reconcile endpoint uses POST body overrides when provided', async () => {
  const deps = createDeps();
  let capturedArgs: { olderThanMinutes: number; batchSize: number } | undefined;

  deps.releaseStaleReservations = async (args) => {
    capturedArgs = args;
    return {
      scanned: 1,
      released: 1,
      threshold: new Date('2026-04-06T10:00:00.000Z'),
    };
  };

  const result = await handleIncentivesReconcileRequest(
    createRequest({
      method: 'POST',
      headers: { 'x-reconcile-token': 'secret-token' },
      body: { olderThanMinutes: 15, batchSize: 5 },
    }),
    deps,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(capturedArgs, { olderThanMinutes: 15, batchSize: 5 });
});
