import test from 'node:test';
import assert from 'node:assert/strict';
import { getRegistrationState } from '@/lib/auth/registration-utils';

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

