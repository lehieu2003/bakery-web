import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESET_PASSWORD_EXPIRES_IN_SECONDS,
  applyPasswordReset,
  buildResetPasswordRequestSuccessData,
  buildResetPasswordVerifySuccessData,
  sanitizeResetPasswordVerifyError,
} from '@/lib/auth/reset-password-utils';

test('buildResetPasswordRequestSuccessData returns stable generic payload', () => {
  const payload = buildResetPasswordRequestSuccessData('User@Example.com');

  assert.equal(payload.message, 'Nếu email tồn tại, OTP đã được gửi');
  assert.equal(payload.email, 'user@example.com');
  assert.equal(payload.expiresIn, RESET_PASSWORD_EXPIRES_IN_SECONDS);
});

test('buildResetPasswordVerifySuccessData returns reset success message', () => {
  const payload = buildResetPasswordVerifySuccessData();
  assert.equal(payload.message, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại');
});

test('sanitizeResetPasswordVerifyError hides account existence details', () => {
  assert.equal(
    sanitizeResetPasswordVerifyError('Người dùng không tồn tại'),
    'Yêu cầu đặt lại mật khẩu không hợp lệ',
  );
  assert.equal(
    sanitizeResetPasswordVerifyError('User does not exist'),
    'Yêu cầu đặt lại mật khẩu không hợp lệ',
  );
  assert.equal(
    sanitizeResetPasswordVerifyError('OTP không đúng'),
    'OTP không đúng',
  );
});

test('applyPasswordReset performs update and session revoke inside transaction', async () => {
  const calls: Array<{ method: string; payload: unknown }> = [];

  const prismaClient = {
    async $transaction<T>(callback: (tx: {
      user: { update: (args: unknown) => Promise<unknown> };
      session: { deleteMany: (args: unknown) => Promise<unknown> };
    }) => Promise<T>) {
      calls.push({ method: '$transaction', payload: null });
      return callback({
        user: {
          async update(args: unknown) {
            calls.push({ method: 'user.update', payload: args });
            return null;
          },
        },
        session: {
          async deleteMany(args: unknown) {
            calls.push({ method: 'session.deleteMany', payload: args });
            return null;
          },
        },
      });
    },
  };

  await applyPasswordReset(prismaClient, 'user-1', 'hashed-password');

  assert.equal(calls[0].method, '$transaction');
  assert.deepEqual(calls[1], {
    method: 'user.update',
    payload: {
      where: { id: 'user-1' },
      data: { password: 'hashed-password' },
    },
  });

  assert.deepEqual(calls[2], {
    method: 'session.deleteMany',
    payload: {
      where: { userId: 'user-1' },
    },
  });
});
