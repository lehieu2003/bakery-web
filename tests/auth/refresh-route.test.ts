import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleRefreshRequest,
  type RefreshRouteDeps,
} from '@/app/api/auth/refresh/route';

type RotateResult =
  | { status: 'rotated'; token: string; expiresAt: Date }
  | { status: 'replayed' }
  | { status: 'unauthorized' };

function createSetCookie() {
  const calls: string[] = [];
  return {
    setCookie: async (token: string) => {
      calls.push(token);
    },
    calls,
  };
}

function createDeps(
  result: RotateResult,
): { deps: RefreshRouteDeps; setCookieCalls: string[] } {
  const { setCookie, calls } = createSetCookie();
  return {
    deps: {
      readSessionToken: () => ({ token: 'token-current', source: 'cookie' as const }),
      rotateSession: async () => result,
      setSessionCookie: setCookie,
      revokeSessionByToken: async () => undefined,
      clearSessionCookie: async () => undefined,
    },
    setCookieCalls: calls,
  };
}

function requestWith(headers: Record<string, string>) {
  return { headers: new Headers(headers) } as unknown as Request;
}

test('refresh rotates the session, sets the cookie, and returns the token', async () => {
  const { deps, setCookieCalls } = createDeps({
    status: 'rotated',
    token: 'token-new',
    expiresAt: new Date('2026-10-30T00:00:00.000Z'),
  });

  const response = await handleRefreshRequest(requestWith({}), deps);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  const data = response.body.data as { token: string };
  assert.equal(data.token, 'token-new');
  assert.deepEqual(setCookieCalls, ['token-new']);
});

test('refresh from the Bearer header works for mobile clients', async () => {
  let seenToken = '';
  const { deps, setCookieCalls } = createDeps({
    status: 'rotated',
    token: 'token-new',
    expiresAt: new Date('2026-10-30T00:00:00.000Z'),
  });
  deps.readSessionToken = () => {
    seenToken = 'bearer-token';
    return { token: 'bearer-token', source: 'bearer' as const };
  };

  const response = await handleRefreshRequest(
    requestWith({ authorization: 'Bearer bearer-token' }),
    deps,
  );

  assert.equal(seenToken, 'bearer-token');
  assert.equal(response.status, 200);
  assert.equal((response.body.data as { token: string }).token, 'token-new');
  assert.equal(setCookieCalls.length, 0); // mobile: no cookie side effect
});

test('a replayed token returns 401 (all sessions already revoked)', async () => {
  const { deps } = createDeps({ status: 'replayed' });
  const response = await handleRefreshRequest(requestWith({}), deps);
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('a missing or unknown token returns 401', async () => {
  const { deps } = createDeps({ status: 'unauthorized' });
  const response = await handleRefreshRequest(requestWith({}), deps);
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});
