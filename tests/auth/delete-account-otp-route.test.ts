import test from 'node:test';
import assert from 'node:assert/strict';
import { handleDeleteAccountOtpRequest } from '@/app/api/auth/delete-account/otp/route';

const customer = { id: 'u1', email: 'lan@example.com', role: 'CUSTOMER' as const };

function makeDeps(
  overrides: Partial<Parameters<typeof handleDeleteAccountOtpRequest>[0]> = {},
) {
  const sent: Array<{ email: string; otp: string }> = [];
  const stored: Array<{ email: string; purpose: string }> = [];
  const deps = {
    getCurrentUser: async () => customer,
    checkRateLimit: async () => ({ allowed: true }),
    checkCooldown: async () => ({ allowed: true }),
    generateOtp: () => '482913',
    createOtpVerification: async (email: string, purpose: string) => {
      stored.push({ email, purpose });
    },
    sendOtp: async (email: string, otp: string) => {
      sent.push({ email, otp });
    },
    ...overrides,
  };
  return { deps, sent, stored };
}

test('delete-account OTP requires a signed-in user', async () => {
  const { deps, sent } = makeDeps({ getCurrentUser: async () => null });

  const result = await handleDeleteAccountOtpRequest(deps);

  assert.equal(result.status, 401);
  assert.deepEqual(sent, []);
});

test('delete-account OTP is refused for admins', async () => {
  const { deps, sent } = makeDeps({
    getCurrentUser: async () => ({ ...customer, role: 'ADMIN' as const }),
  });

  const result = await handleDeleteAccountOtpRequest(deps);

  assert.equal(result.status, 403);
  assert.deepEqual(sent, []);
});

test('delete-account OTP goes to the signed-in account email', async () => {
  const { deps, sent, stored } = makeDeps();

  const result = await handleDeleteAccountOtpRequest(deps);

  assert.equal(result.status, 200);
  assert.deepEqual(stored, [{ email: 'lan@example.com', purpose: 'DELETE_ACCOUNT' }]);
  assert.deepEqual(sent, [{ email: 'lan@example.com', otp: '482913' }]);
});

test('delete-account OTP honours the per-email cooldown', async () => {
  const { deps, sent } = makeDeps({
    checkCooldown: async () => ({ allowed: false, retryAfter: 42, message: 'wait' }),
  });

  const result = await handleDeleteAccountOtpRequest(deps);

  assert.equal(result.status, 429);
  assert.deepEqual(sent, []);
});

test('delete-account OTP reports a failed send', async () => {
  const { deps } = makeDeps({
    sendOtp: async () => {
      throw new Error('smtp down');
    },
  });

  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await handleDeleteAccountOtpRequest(deps);
    assert.equal(result.status, 500);
  } finally {
    console.error = originalError;
  }
});
