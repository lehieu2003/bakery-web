import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRegistrationState,
  registerOtpSentData,
  registerVerifyStateError,
} from '@/lib/auth/registration-utils';
import { validatePassword } from '@/lib/password';

test('register answers every email with the same OTP-sent payload', () => {
  assert.deepEqual(registerOtpSentData('lan@example.com'), {
    message: 'Nếu email hợp lệ, OTP đã được gửi',
    email: 'lan@example.com',
    expiresIn: 300,
    pending: true,
  });
});

test('register verify gives already-verified and unknown emails the same error', () => {
  const expected = 'OTP không hợp lệ hoặc đã hết hạn';
  assert.equal(registerVerifyStateError(null), expected);
  assert.equal(registerVerifyStateError({ emailVerifiedAt: new Date() }), expected);
  assert.equal(registerVerifyStateError({ emailVerifiedAt: null }), null);
});

test('password policy requires 8 characters everywhere', () => {
  assert.equal(validatePassword('abc1234').valid, false);
  assert.equal(validatePassword('abc12345').valid, true);
  assert.equal(validatePassword('12345678').valid, false);
});

test('returns NEW when user does not exist', () => {
  assert.equal(getRegistrationState(null), 'NEW');
});

test('returns PENDING when user exists without email verification', () => {
  assert.equal(
    getRegistrationState({ emailVerifiedAt: null }),
    'PENDING',
  );
});

test('returns VERIFIED when user has emailVerifiedAt', () => {
  assert.equal(
    getRegistrationState({ emailVerifiedAt: new Date() }),
    'VERIFIED',
  );
});

