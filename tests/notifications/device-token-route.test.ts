import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deactivateSurplusDeviceTokens,
  handleRegisterDeviceTokenRequest,
  handleRevokeDeviceTokenRequest,
  MAX_ACTIVE_DEVICE_TOKENS,
} from '@/app/api/notifications/device-token/route';

const noopDeps = {
  getCurrentUser: async () => ({ id: 'u1' }),
  upsertToken: async () => ({
    id: 'dt-1',
    isActive: true,
    updatedAt: new Date('2026-05-04T00:00:00.000Z'),
  }),
  revokeToken: async () => ({ count: 0 }),
};

test('POST /api/notifications/device-token rejects oversized fields', async () => {
  for (const body of [
    { token: 'x'.repeat(4097), platform: 'android' },
    { token: 'tok', platform: 'android', deviceId: 'd'.repeat(129) },
    { token: 'tok', platform: 'android', appVersion: 'v'.repeat(129) },
  ]) {
    const result = await handleRegisterDeviceTokenRequest(
      makeRequest('http://localhost/api/notifications/device-token', body),
      noopDeps,
    );
    assert.equal(result.status, 400);
  }
});

test('registering past the cap deactivates the least recently registered tokens', async () => {
  const found: unknown[] = [];
  const deactivated: unknown[] = [];
  const tx = {
    deviceToken: {
      findMany: async (args: unknown) => {
        found.push(args);
        return [{ id: 'old-1' }, { id: 'old-2' }];
      },
      updateMany: async (args: unknown) => {
        deactivated.push(args);
        return { count: 2 };
      },
    },
  };

  await deactivateSurplusDeviceTokens(tx as never, 'u1');

  assert.equal(MAX_ACTIVE_DEVICE_TOKENS, 10);
  assert.deepEqual(found, [
    {
      where: { userId: 'u1', isActive: true },
      orderBy: { lastRegistered: 'desc' },
      skip: MAX_ACTIVE_DEVICE_TOKENS,
      select: { id: true },
    },
  ]);
  const update = deactivated[0] as { where: unknown; data: { isActive: boolean } };
  assert.deepEqual(update.where, { id: { in: ['old-1', 'old-2'] } });
  assert.equal(update.data.isActive, false);
});

test('within the cap no token is deactivated', async () => {
  let updated = false;
  const tx = {
    deviceToken: {
      findMany: async () => [],
      updateMany: async () => {
        updated = true;
        return { count: 0 };
      },
    },
  };

  await deactivateSurplusDeviceTokens(tx as never, 'u1');

  assert.equal(updated, false);
});

function makeRequest(url: string, body: unknown, shouldThrow = false) {
  return {
    url,
    json: async () => {
      if (shouldThrow) {
        throw new Error('invalid json');
      }
      return body;
    },
  } as never;
}

test('POST /api/notifications/device-token returns 401 for unauthenticated user', async () => {
  const result = await handleRegisterDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: 'tok-1',
      platform: 'web',
    }),
    {
      getCurrentUser: async () => null,
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('POST /api/notifications/device-token validates payload', async () => {
  const result = await handleRegisterDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: '',
      platform: 'unknown',
    }),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Dữ liệu yêu cầu không hợp lệ');
});

test('POST /api/notifications/device-token registers token idempotently', async () => {
  let calls = 0;
  let capturedUserId = '';
  let capturedToken = '';

  const deps = {
    getCurrentUser: async () => ({ id: 'u1' }),
    upsertToken: async (args: {
      userId: string;
      input: { token: string; platform: string; deviceId: string | null; appVersion: string | null };
    }) => {
      calls += 1;
      capturedUserId = args.userId;
      capturedToken = args.input.token;
      return {
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      };
    },
    revokeToken: async () => ({ count: 0 }),
  };

  const req = makeRequest('http://localhost/api/notifications/device-token', {
    token: 'tok-abc',
    platform: 'web',
    deviceId: 'dev-1',
    appVersion: '1.0.0',
  });

  const first = await handleRegisterDeviceTokenRequest(req, deps);
  const second = await handleRegisterDeviceTokenRequest(req, deps);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(calls, 2);
  assert.equal(capturedUserId, 'u1');
  assert.equal(capturedToken, 'tok-abc');
  assert.equal(first.body.success, true);
  assert.equal(first.body.data?.token, 'tok-abc');
});

test('POST /api/notifications/device-token returns 409 on cross-user token collision', async () => {
  const result = await handleRegisterDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: 'tok-collide',
      platform: 'android',
    }),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => {
        throw new Error('Device token already belongs to another user');
      },
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 409);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Device token is already registered to another user');
});

test('POST /api/notifications/device-token returns 400 for malformed JSON body', async () => {
  const result = await handleRegisterDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', null, true),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Dữ liệu yêu cầu không hợp lệ');
});

test('DELETE /api/notifications/device-token returns 401 for unauthenticated user', async () => {
  const result = await handleRevokeDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: 'tok-1',
    }),
    {
      getCurrentUser: async () => null,
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('DELETE /api/notifications/device-token revokes only target token and returns count', async () => {
  let capturedUserId = '';
  let capturedToken = '';

  const result = await handleRevokeDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: 'tok-2',
    }),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async (args: { userId: string; token: string }) => {
        capturedUserId = args.userId;
        capturedToken = args.token;
        return { count: 1 };
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.count, 1);
  assert.equal(capturedUserId, 'u1');
  assert.equal(capturedToken, 'tok-2');
});

test('DELETE /api/notifications/device-token validates payload', async () => {
  const result = await handleRevokeDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: '   ',
    }),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Dữ liệu yêu cầu không hợp lệ');
});

test('DELETE /api/notifications/device-token returns 400 for malformed JSON body', async () => {
  const result = await handleRevokeDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', null, true),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Dữ liệu yêu cầu không hợp lệ');
});

test('DELETE /api/notifications/device-token returns safe success when token not found', async () => {
  const result = await handleRevokeDeviceTokenRequest(
    makeRequest('http://localhost/api/notifications/device-token', {
      token: 'tok-missing',
    }),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      upsertToken: async () => ({
        id: 'dt-1',
        isActive: true,
        updatedAt: new Date('2026-05-04T00:00:00.000Z'),
      }),
      revokeToken: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.count, 0);
});
