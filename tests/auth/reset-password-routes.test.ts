import test from 'node:test';
import assert from 'node:assert/strict';
import { handleResetPasswordRequest } from '@/app/api/auth/reset-password/route';
import { handleResetPasswordVerifyRequest } from '@/app/api/auth/reset-password/verify/route';

test('reset-password request returns 400 when email is missing', async () => {
  const result = await handleResetPasswordRequest({});

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});

test('reset-password request returns 400 for non-object payload', async () => {
  const result = await handleResetPasswordRequest('invalid' as never);

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Payload không hợp lệ');
});

test('reset-password request returns generic success for unknown email and does not send OTP email', async () => {
  let sendOtpCalled = false;
  let createOtpCalled = false;

  const result = await handleResetPasswordRequest(
    { email: 'unknown@example.com' },
    {
      validateEmail: () => ({ valid: true, normalized: 'unknown@example.com' }),
      checkRateLimit: async () => ({ allowed: true }),
      checkCooldown: async () => ({ allowed: true }),
      findUserByEmail: async () => null,
      generateOtp: () => '123456',
      createOtpVerification: async () => {
        createOtpCalled = true;
        return {} as never;
      },
      sendOtp: async () => {
        sendOtpCalled = true;
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.message, 'Nếu email tồn tại, OTP đã được gửi');
  assert.equal(createOtpCalled, true);
  assert.equal(sendOtpCalled, false);
});

test('reset-password request returns 429 when throttled', async () => {
  const result = await handleResetPasswordRequest(
    { email: 'user@example.com' },
    {
      validateEmail: () => ({ valid: true, normalized: 'user@example.com' }),
      checkRateLimit: async () => ({
        allowed: false,
        retryAfter: 30,
        message: 'rate limited',
      }),
      checkCooldown: async () => ({ allowed: true }),
      findUserByEmail: async () => ({ id: 'u1' }),
      generateOtp: () => '123456',
      createOtpVerification: async () => ({} as never),
      sendOtp: async () => undefined,
    },
  );

  assert.equal(result.status, 429);
  assert.equal(result.body.success, false);
  assert.equal(result.body.data?.retryAfter, 30);
});

test('reset-password verify returns sanitized error on OTP failure', async () => {
  const result = await handleResetPasswordVerifyRequest(
    { email: 'user@example.com', otp: '999999', newPassword: 'secret12' },
    {
      validateEmail: () => ({ valid: true, normalized: 'user@example.com' }),
      verifyOtp: async () => ({
        success: false,
        message: 'Người dùng không tồn tại',
      }),
      findUserByEmail: async () => ({ id: 'u1' }),
      hashPassword: async () => 'hashed',
      applyPasswordReset: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Yêu cầu đặt lại mật khẩu không hợp lệ');
});

test('reset-password verify returns 400 for non-object payload', async () => {
  const result = await handleResetPasswordVerifyRequest('invalid' as never);

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Payload không hợp lệ');
});

test('reset-password verify returns sanitized error when user is missing after OTP verification', async () => {
  const result = await handleResetPasswordVerifyRequest(
    { email: 'user@example.com', otp: '123456', newPassword: 'secret12' },
    {
      validateEmail: () => ({ valid: true, normalized: 'user@example.com' }),
      verifyOtp: async () => ({
        success: true,
        message: 'ok',
      }),
      findUserByEmail: async () => null,
      hashPassword: async () => 'hashed',
      applyPasswordReset: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Yêu cầu đặt lại mật khẩu không hợp lệ');
});

test('reset-password verify returns success and calls reset side effects', async () => {
  const calls: Array<{ userId: string; passwordHash: string }> = [];

  const result = await handleResetPasswordVerifyRequest(
    { email: 'user@example.com', otp: '123456', newPassword: 'secret12' },
    {
      validateEmail: () => ({ valid: true, normalized: 'user@example.com' }),
      verifyOtp: async () => ({
        success: true,
        message: 'ok',
      }),
      findUserByEmail: async () => ({ id: 'u1' }),
      hashPassword: async () => 'hashed-secret',
      applyPasswordReset: async (_client, userId, passwordHash) => {
        calls.push({ userId, passwordHash });
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { userId: 'u1', passwordHash: 'hashed-secret' });
});
