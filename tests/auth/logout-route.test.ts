import test from 'node:test';
import assert from 'node:assert/strict';
import { handleLogoutRequest } from '@/app/api/auth/logout/route';

function requestWith(headers: Record<string, string>) {
  return { headers: new Headers(headers) } as unknown as Request;
}

test('cookie logout deletes the session and clears the cookie', async () => {
  const calls: string[] = [];
  const result = await handleLogoutRequest(requestWith({}), {
    readPresentedToken: () => null,
    deleteServerSession: async () => {
      calls.push('deleteSession');
    },
    revokeSessionByToken: async () => {
      calls.push('revokeSessionByToken');
    },
    clearSessionCookie: async () => {
      calls.push('clearCookie');
    },
  });

  assert.equal(result.status, 200);
  assert.deepEqual(calls, ['deleteSession', 'clearCookie']);
});

test("bearer logout revokes the presented token server-side (rule 3, mobile)", async () => {
  const calls: string[] = [];
  let revokedToken = '';
  const result = await handleLogoutRequest(
    requestWith({ authorization: 'Bearer token-abc' }),
    {
      readPresentedToken: () => ({
        token: 'token-abc',
        source: 'bearer' as const,
      }),
      deleteServerSession: async () => {
        calls.push('deleteSession');
      },
      revokeSessionByToken: async (token: string) => {
        revokedToken = token;
        calls.push('revokeSessionByToken');
      },
      clearSessionCookie: async () => {
        calls.push('clearCookie');
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(revokedToken, 'token-abc');
  assert.deepEqual(calls, ['deleteSession', 'revokeSessionByToken']);
});
