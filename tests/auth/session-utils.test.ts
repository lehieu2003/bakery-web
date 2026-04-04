import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseAuthenticatedSession,
  isSessionExpired,
} from '@/lib/auth/session-utils';

test('rejects unverified active user', () => {
  assert.equal(
    canUseAuthenticatedSession({
      emailVerifiedAt: null,
      isActive: true,
    }),
    false,
  );
});

test('rejects verified inactive user', () => {
  assert.equal(
    canUseAuthenticatedSession({
      emailVerifiedAt: new Date(),
      isActive: false,
    }),
    false,
  );
});

test('allows verified active user', () => {
  assert.equal(
    canUseAuthenticatedSession({
      emailVerifiedAt: new Date(),
      isActive: true,
    }),
    true,
  );
});

test('marks past expiry as expired', () => {
  const now = new Date('2026-04-04T00:00:00.000Z');
  const expiresAt = new Date('2026-04-03T23:59:59.000Z');
  assert.equal(isSessionExpired(expiresAt, now), true);
});

test('marks future expiry as valid', () => {
  const now = new Date('2026-04-04T00:00:00.000Z');
  const expiresAt = new Date('2026-04-04T00:00:01.000Z');
  assert.equal(isSessionExpired(expiresAt, now), false);
});
