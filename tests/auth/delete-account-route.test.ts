import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anonymizedUserData,
  deletedUserEmail,
  handleDeleteAccountRequest,
} from '@/app/api/auth/delete-account/route';

test('a deleted account keeps no personal identifier, including its Google link', () => {
  const data = anonymizedUserData('u1', 'unusable-hash');

  assert.equal(data.googleId, null);
  assert.equal(data.email, deletedUserEmail('u1'));
  assert.equal(data.name, null);
  assert.equal(data.phone, null);
  assert.equal(data.isActive, false);
});

const customer = { id: 'u1', email: 'lan@example.com', role: 'CUSTOMER' as const };

function makeDeps(overrides: Partial<Parameters<typeof handleDeleteAccountRequest>[1]> = {}) {
  const anonymized: string[] = [];
  const otpChecks: Array<{ email: string; otp: string }> = [];
  const deps = {
    getCurrentUser: async () => customer,
    getPasswordHash: async () => 'hash',
    verifyPassword: async (password: string) => password === 'correct-password',
    verifyDeleteOtp: async (email: string, otp: string) => {
      otpChecks.push({ email, otp });
      return otp === '482913'
        ? { success: true, message: 'ok' }
        : { success: false, message: 'OTP không đúng. Còn 4 lần thử' };
    },
    countOpenOrders: async () => 0,
    anonymizeUser: async (userId: string) => {
      anonymized.push(userId);
    },
    ...overrides,
  };
  return { deps, anonymized, otpChecks };
}

test('delete-account accepts the emailed OTP instead of a password', async () => {
  const { deps, anonymized, otpChecks } = makeDeps({ getPasswordHash: async () => null });

  const result = await handleDeleteAccountRequest({ otp: '482913' }, deps);

  assert.equal(result.status, 200);
  assert.deepEqual(otpChecks, [{ email: 'lan@example.com', otp: '482913' }]);
  assert.deepEqual(anonymized, ['u1']);
});

test('delete-account rejects a wrong OTP with its message', async () => {
  const { deps, anonymized } = makeDeps();

  const result = await handleDeleteAccountRequest({ otp: '000000' }, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'OTP không đúng. Còn 4 lần thử');
  assert.deepEqual(anonymized, []);
});

test('delete-account returns 401 when not signed in', async () => {
  const { deps, anonymized } = makeDeps({ getCurrentUser: async () => null });

  const result = await handleDeleteAccountRequest({ password: 'correct-password' }, deps);

  assert.equal(result.status, 401);
  assert.deepEqual(anonymized, []);
});

test('delete-account refuses admin accounts', async () => {
  const { deps, anonymized } = makeDeps({
    getCurrentUser: async () => ({ id: 'a1', email: 'admin@example.com', role: 'ADMIN' as const }),
  });

  const result = await handleDeleteAccountRequest({ password: 'correct-password' }, deps);

  assert.equal(result.status, 403);
  assert.deepEqual(anonymized, []);
});

test('delete-account requires a password or an OTP', async () => {
  const { deps, anonymized } = makeDeps();

  for (const body of [{}, { password: '' }, { password: 123 }, { otp: '' }, { otp: 482913 }]) {
    const result = await handleDeleteAccountRequest(body, deps);
    assert.equal(result.status, 400);
  }
  assert.deepEqual(anonymized, []);
});

test('delete-account rejects a wrong password', async () => {
  const { deps, anonymized } = makeDeps();

  const result = await handleDeleteAccountRequest({ password: 'wrong' }, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'Mật khẩu không đúng');
  assert.deepEqual(anonymized, []);
});

test('delete-account is blocked while orders are still open', async () => {
  const { deps, anonymized } = makeDeps({ countOpenOrders: async () => 2 });

  const result = await handleDeleteAccountRequest({ password: 'correct-password' }, deps);

  assert.equal(result.status, 409);
  assert.deepEqual(result.body.data, { openOrders: 2 });
  assert.deepEqual(anonymized, []);
});

test('delete-account anonymizes the signed-in user on success', async () => {
  const { deps, anonymized } = makeDeps();

  const result = await handleDeleteAccountRequest({ password: 'correct-password' }, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(anonymized, ['u1']);
});

test('deleted accounts get an undeliverable, unique email', () => {
  assert.equal(deletedUserEmail('u1'), 'deleted-u1@deleted.invalid');
  assert.notEqual(deletedUserEmail('u1'), deletedUserEmail('u2'));
});
