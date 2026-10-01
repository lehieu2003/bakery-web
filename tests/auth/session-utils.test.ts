import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseAuthenticatedSession,
  isSessionExpired,
  isSessionUsable,
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


test('isSessionUsable: a revoked session can never authenticate (rule 2 enforcement)', () => {
  assert.equal(
    isSessionUsable({
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      user: { isActive: true, emailVerifiedAt: new Date() },
    }),
    false,
  );
});

test('isSessionUsable: expired session is unusable', () => {
  assert.equal(
    isSessionUsable({
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { isActive: true, emailVerifiedAt: new Date() },
    }),
    false,
  );
});

test('isSessionUsable: inactive or unverified user is unusable', () => {
  assert.equal(
    isSessionUsable({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      user: { isActive: false, emailVerifiedAt: new Date() },
    }),
    false,
  );
  assert.equal(
    isSessionUsable({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      user: { isActive: true, emailVerifiedAt: null },
    }),
    false,
  );
});

test('isSessionUsable: a live session passes', () => {
  assert.equal(
    isSessionUsable({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      user: { isActive: true, emailVerifiedAt: new Date() },
    }),
    true,
  );
});

test('assertAdminAccess: customer denied, admin passes, anonymous denied', async () => {
  const { assertAdminAccess } = await import('@/lib/session');
  assert.throws(
    () => assertAdminAccess(null as never),
    /Unauthorized/,
  );
  assert.throws(
    () => assertAdminAccess({ role: 'CUSTOMER' } as never),
    /Forbidden: Admin access required/,
  );
  const user = { role: 'ADMIN', id: 'a1' } as never;
  assert.equal(assertAdminAccess(user), user);
});
