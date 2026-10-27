import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGoogleMobileAuthRequest } from '@/app/api/auth/google/mobile/route';
import { __resetIpRateLimitForTests } from '@/lib/rate-limit';

const WEB_CLIENT_ID = 'web-client.apps.googleusercontent.com';

const validTokenInfo = {
  aud: WEB_CLIENT_ID,
  sub: 'google-sub-1',
  email: 'customer@example.com',
  email_verified: 'true',
  name: 'Customer',
};

function mobileRequest(body: unknown, ip = '203.0.113.50'): Request {
  return new Request('http://localhost/api/auth/google/mobile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

function makeDeps(
  overrides: Partial<Parameters<typeof handleGoogleMobileAuthRequest>[1]> = {},
) {
  const upserted: unknown[] = [];
  const deps = {
    getAllowedAudiences: () => [WEB_CLIENT_ID],
    fetchTokenInfo: async () => validTokenInfo as Record<string, string>,
    upsertGoogleUser: async (info: { sub: string; email: string }) => {
      upserted.push(info);
      return { id: 'u1' };
    },
    createSession: async () => ({
      token: 'raw-session-token',
      user: {
        id: 'u1',
        email: 'customer@example.com',
        name: 'Customer',
        role: 'CUSTOMER',
        memberLevel: 'SILVER',
        points: 0,
      },
    }),
    setSessionCookie: async () => {},
    ...overrides,
  };
  return { deps, upserted };
}

test('google mobile auth rejects an access token without an id token', async () => {
  __resetIpRateLimitForTests();
  const { deps, upserted } = makeDeps();

  const result = await handleGoogleMobileAuthRequest(
    mobileRequest({ accessToken: 'ya29.attacker-app-token' }),
    deps,
  );

  assert.equal(result.status, 400);
  assert.deepEqual(upserted, []);
});

test('google mobile auth rejects an id token issued to another client', async () => {
  __resetIpRateLimitForTests();
  const { deps, upserted } = makeDeps({
    fetchTokenInfo: async () => ({ ...validTokenInfo, aud: 'other-app.apps.googleusercontent.com' }),
  });

  const result = await handleGoogleMobileAuthRequest(mobileRequest({ idToken: 'id' }), deps);

  assert.equal(result.status, 401);
  assert.deepEqual(upserted, []);
});

test('google mobile auth rejects an unverified google email', async () => {
  __resetIpRateLimitForTests();
  const { deps, upserted } = makeDeps({
    fetchTokenInfo: async () => ({ ...validTokenInfo, email_verified: 'false' }),
  });

  const result = await handleGoogleMobileAuthRequest(mobileRequest({ idToken: 'id' }), deps);

  assert.equal(result.status, 401);
  assert.deepEqual(upserted, []);
});

test('google mobile auth rejects tokens Google does not validate', async () => {
  __resetIpRateLimitForTests();
  const { deps, upserted } = makeDeps({ fetchTokenInfo: async () => null });

  const result = await handleGoogleMobileAuthRequest(mobileRequest({ idToken: 'id' }), deps);

  assert.equal(result.status, 401);
  assert.deepEqual(upserted, []);
});

test('google mobile auth fails closed when no audience is configured', async () => {
  __resetIpRateLimitForTests();
  const { deps, upserted } = makeDeps({ getAllowedAudiences: () => [] });

  const result = await handleGoogleMobileAuthRequest(mobileRequest({ idToken: 'id' }), deps);

  assert.equal(result.status, 500);
  assert.deepEqual(upserted, []);
});

test('google mobile auth signs in with a valid id token for this app', async () => {
  __resetIpRateLimitForTests();
  const { deps, upserted } = makeDeps();

  const result = await handleGoogleMobileAuthRequest(
    mobileRequest({ idToken: 'id', accessToken: 'ignored' }),
    deps,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(upserted, [
    {
      sub: 'google-sub-1',
      email: 'customer@example.com',
      name: 'Customer',
      picture: undefined,
      email_verified: true,
    },
  ]);
  const body = result.body as { success: boolean; data: { token: string } };
  assert.equal(body.success, true);
  assert.equal(body.data.token, 'raw-session-token');
});

test('google mobile auth is rate limited per IP', async () => {
  __resetIpRateLimitForTests();
  const { deps } = makeDeps({ fetchTokenInfo: async () => null });

  for (let attempt = 1; attempt <= 10; attempt++) {
    const result = await handleGoogleMobileAuthRequest(
      mobileRequest({ idToken: 'id' }, '203.0.113.51'),
      deps,
    );
    assert.equal(result.status, 401);
  }

  const blocked = await handleGoogleMobileAuthRequest(
    mobileRequest({ idToken: 'id' }, '203.0.113.51'),
    deps,
  );
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers?.['Retry-After']) > 0);
});
