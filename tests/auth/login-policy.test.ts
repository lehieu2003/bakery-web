import test from 'node:test';
import assert from 'node:assert/strict';
import { canAuthenticateWithPassword } from '@/lib/auth/login-policy';

test('rejects account without password', () => {
  assert.equal(
    canAuthenticateWithPassword({
      password: null,
      emailVerifiedAt: new Date(),
      isActive: true,
    }),
    false,
  );
});

test('rejects unverified account even if password exists', () => {
  assert.equal(
    canAuthenticateWithPassword({
      password: 'hashed',
      emailVerifiedAt: null,
      isActive: true,
    }),
    false,
  );
});

test('rejects inactive account', () => {
  assert.equal(
    canAuthenticateWithPassword({
      password: 'hashed',
      emailVerifiedAt: new Date(),
      isActive: false,
    }),
    false,
  );
});

test('allows verified active account with password', () => {
  assert.equal(
    canAuthenticateWithPassword({
      password: 'hashed',
      emailVerifiedAt: new Date(),
      isActive: true,
    }),
    true,
  );
});
