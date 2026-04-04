import test from 'node:test';
import assert from 'node:assert/strict';
import { ENDPOINTS } from '@/lib/api/endpoints';

test('register verify endpoint uses verify-email route', () => {
  assert.equal(ENDPOINTS.AUTH.REGISTER_VERIFY, '/api/auth/verify-email');
});

test('auth endpoint constants remain aligned for login/logout/me', () => {
  assert.equal(ENDPOINTS.AUTH.LOGIN, '/api/auth/login');
  assert.equal(ENDPOINTS.AUTH.LOGOUT, '/api/auth/logout');
  assert.equal(ENDPOINTS.AUTH.ME, '/api/auth/me');
});

test('auth reset-password endpoints remain aligned', () => {
  assert.equal(ENDPOINTS.AUTH.RESET_PASSWORD, '/api/auth/reset-password');
  assert.equal(
    ENDPOINTS.AUTH.RESET_PASSWORD_VERIFY,
    '/api/auth/reset-password/verify',
  );
});
