import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SESSION_DAYS,
  LOGIN_CHALLENGES_PER_WINDOW,
  LOGIN_CHALLENGE_MAX_ATTEMPTS,
  decideSignIn,
  describeDevice,
  hashDeviceId,
  isAdminSessionBound,
  maskEmail,
  pendingSignInResponse,
  resolveClientDevice,
  verifySignInChallenge,
  type AdminDeviceDeps,
  type ClientDevice,
  type VerifyDeps,
} from '@/lib/auth/admin-device';
import { hashOtp } from '@/lib/otp';
import { rotateSession, type RotateSessionDeps } from '@/lib/auth/session-rotation';

const NOW = new Date('2026-10-28T10:00:00.000Z');
const PHONE_ID = 'phone-device-id-0001';
const OTHER_ID = 'other-device-id-0002';
const admin = { id: 'admin-1', email: 'owner@bakery.vn', role: 'ADMIN' };
const customer = { id: 'cust-1', email: 'khach@bakery.vn', role: 'CUSTOMER' };
const phone: ClientDevice = { platform: 'mobile', deviceId: PHONE_ID, mintedCookie: null };

function request(headers: Record<string, string>, cookie?: string) {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    cookies: {
      get: (name: string) =>
        name === 'bakery_device' && cookie ? { value: cookie } : undefined,
    },
  };
}

function signInDeps(trustedHash: string | null, recentChallenges = 0) {
  const calls = {
    revoked: [] as string[],
    touched: [] as string[],
    challenges: [] as Array<{ platform: string; deviceIdHash: string; otpHash: string }>,
    emails: [] as Array<{ to: string; code: string }>,
  };
  const deps: AdminDeviceDeps = {
    now: () => NOW,
    findTrustedDevice: async () => (trustedHash ? { deviceIdHash: trustedHash } : null),
    countRecentChallenges: async () => recentChallenges,
    createChallenge: async (data) => {
      calls.challenges.push(data);
      return { id: 'ch-1' };
    },
    sendChallengeEmail: async ({ to, code }) => {
      calls.emails.push({ to, code });
      return true;
    },
    revokePlatformSessions: async (_userId, platform) => {
      calls.revoked.push(platform);
    },
    touchTrustedDevice: async (_userId, platform) => {
      calls.touched.push(platform);
    },
  };
  return { deps, calls };
}

test('the app identifies itself; a browser keeps its id in a cookie', () => {
  assert.deepEqual(
    resolveClientDevice(request({ 'x-client-platform': 'mobile', 'x-device-id': PHONE_ID })),
    phone,
  );
  // App builds before device ids: still the app, but with no id to trust.
  assert.deepEqual(
    resolveClientDevice(request({ 'user-agent': 'Dart/3.8 (dart:io)' })),
    { platform: 'mobile', deviceId: null, mintedCookie: null },
  );
  assert.deepEqual(resolveClientDevice(request({}, OTHER_ID)), {
    platform: 'web',
    deviceId: OTHER_ID,
    mintedCookie: null,
  });
  const minted = resolveClientDevice(request({ 'user-agent': 'Mozilla/5.0' }));
  assert.equal(minted.platform, 'web');
  assert.ok(minted.deviceId && minted.deviceId === minted.mintedCookie);
});

test('customers sign in as before: no device checks, no binding', async () => {
  const { deps, calls } = signInDeps(null);
  const decision = await decideSignIn({ user: customer, device: phone }, deps);
  assert.deepEqual(decision, { kind: 'session', binding: null });
  assert.equal(calls.challenges.length, 0);
});

test('an admin on the trusted device gets a bound session; others on that platform end', async () => {
  const { deps, calls } = signInDeps(hashDeviceId(PHONE_ID));
  const decision = await decideSignIn({ user: admin, device: phone }, deps);
  assert.deepEqual(decision, {
    kind: 'session',
    binding: {
      platform: 'mobile',
      deviceIdHash: hashDeviceId(PHONE_ID),
      expiresInDays: ADMIN_SESSION_DAYS.mobile,
    },
  });
  assert.deepEqual(calls.revoked, ['mobile']);
  assert.deepEqual(calls.touched, ['mobile']);
});

test('an admin on another device gets no session, only an emailed code', async () => {
  const { deps, calls } = signInDeps(hashDeviceId(OTHER_ID));
  const decision = await decideSignIn(
    { user: admin, device: phone, userAgent: 'Dart/3.8', ipAddress: '1.2.3.4' },
    deps,
  );
  assert.equal(decision.kind, 'challenge');
  if (decision.kind !== 'challenge') return;
  assert.equal(decision.maskedEmail, 'o***r@bakery.vn');
  assert.equal(calls.challenges[0].deviceIdHash, hashDeviceId(PHONE_ID));
  assert.equal(calls.emails[0].to, 'owner@bakery.vn');
  // The code is mailed, never stored in the clear.
  assert.equal(calls.challenges[0].otpHash, hashOtp(calls.emails[0].code));
  assert.deepEqual(calls.revoked, [], 'the trusted device keeps its session');
});

test('a first admin sign-in (no trusted device yet) also needs the code', async () => {
  const { deps } = signInDeps(null);
  const decision = await decideSignIn({ user: admin, device: phone }, deps);
  assert.equal(decision.kind, 'challenge');
});

test('an admin on an app build without device ids is asked to update', async () => {
  const { deps } = signInDeps(null);
  const decision = await decideSignIn(
    { user: admin, device: { platform: 'mobile', deviceId: null, mintedCookie: null } },
    deps,
  );
  assert.deepEqual(decision, { kind: 'update_app' });
  assert.equal(pendingSignInResponse(decision)?.status, 403);
});

test('codes per account are capped, so a known password cannot mail-bomb', async () => {
  const { deps, calls } = signInDeps(null, LOGIN_CHALLENGES_PER_WINDOW);
  const decision = await decideSignIn({ user: admin, device: phone }, deps);
  assert.deepEqual(decision, { kind: 'rate_limited' });
  assert.equal(pendingSignInResponse(decision)?.status, 429);
  assert.equal(calls.emails.length, 0);
});

function verifyDeps(overrides: Partial<Awaited<ReturnType<VerifyDeps['findChallenge']>>> = {}) {
  const calls = { failed: 0, trusted: [] as unknown[], alerts: 0 };
  let used = false;
  const deps: VerifyDeps = {
    now: () => NOW,
    findChallenge: async () => ({
      id: 'ch-1',
      userId: admin.id,
      platform: 'mobile',
      deviceIdHash: hashDeviceId(PHONE_ID),
      otpHash: hashOtp('123456'),
      attempts: 0,
      expiresAt: new Date(NOW.getTime() + 60_000),
      usedAt: null,
      userAgent: 'Dart/3.8',
      user: { ...admin, isActive: true, emailVerifiedAt: NOW },
      ...overrides,
    }),
    recordFailedAttempt: async () => {
      calls.failed += 1;
    },
    trustDevice: async (args) => {
      if (used) return false;
      used = true;
      calls.trusted.push(args);
      return true;
    },
    sendNewDeviceAlert: async () => {
      calls.alerts += 1;
      return true;
    },
  };
  return { deps, calls };
}

test('the right code from the same device trusts it and alerts the admin', async () => {
  const { deps, calls } = verifyDeps();
  const result = await verifySignInChallenge(
    { challengeId: 'ch-1', code: '123456', device: phone },
    deps,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.binding.platform, 'mobile');
  assert.equal(result.binding.deviceIdHash, hashDeviceId(PHONE_ID));
  assert.equal(calls.trusted.length, 1);
  assert.equal(calls.alerts, 1);

  // A second use of the same code loses.
  const again = await verifySignInChallenge(
    { challengeId: 'ch-1', code: '123456', device: phone },
    deps,
  );
  assert.equal(again.ok, false);
});

test('a wrong code counts an attempt and trusts nothing', async () => {
  const { deps, calls } = verifyDeps();
  const result = await verifySignInChallenge(
    { challengeId: 'ch-1', code: '000000', device: phone },
    deps,
  );
  assert.deepEqual(result, { ok: false, status: 400, error: 'Mã xác minh không đúng hoặc đã hết hạn' });
  assert.equal(calls.failed, 1);
  assert.equal(calls.trusted.length, 0);
});

test('the code does not work from another device', async () => {
  const { deps, calls } = verifyDeps();
  const result = await verifySignInChallenge(
    {
      challengeId: 'ch-1',
      code: '123456',
      device: { platform: 'mobile', deviceId: OTHER_ID, mintedCookie: null },
    },
    deps,
  );
  assert.equal(result.ok, false);
  assert.equal(calls.trusted.length, 0);
});

test('expired, used or exhausted challenges are refused', async () => {
  for (const overrides of [
    { expiresAt: new Date(NOW.getTime() - 1) },
    { usedAt: NOW },
    { attempts: LOGIN_CHALLENGE_MAX_ATTEMPTS },
  ]) {
    const { deps, calls } = verifyDeps(overrides);
    const result = await verifySignInChallenge(
      { challengeId: 'ch-1', code: '123456', device: phone },
      deps,
    );
    assert.equal(result.ok, false, JSON.stringify(overrides));
    assert.equal(calls.trusted.length, 0);
  }
});

test('admin sessions must be bound to a device; customer sessions need not', () => {
  assert.equal(
    isAdminSessionBound({ platform: null, deviceIdHash: null, user: { role: 'ADMIN' } }),
    false,
  );
  assert.equal(
    isAdminSessionBound({ platform: 'web', deviceIdHash: 'h', user: { role: 'ADMIN' } }),
    true,
  );
  assert.equal(
    isAdminSessionBound({ platform: null, deviceIdHash: null, user: { role: 'CUSTOMER' } }),
    true,
  );
});

function rotationDeps(session: Awaited<ReturnType<RotateSessionDeps['findSessionByToken']>>) {
  const created: unknown[] = [];
  const deps: RotateSessionDeps = {
    findSessionByToken: async () => session,
    revokeSession: async () => 1,
    createSession: async (_userId, _ua, _ip, binding) => {
      created.push(binding);
      return { token: 'new', expiresAt: NOW };
    },
    revokeAllUserSessions: async () => undefined,
    now: () => NOW,
  };
  return { deps, created };
}

test('refreshing an admin session keeps it on its device', async () => {
  const { deps, created } = rotationDeps({
    id: 's1',
    userId: admin.id,
    revokedAt: null,
    expiresAt: new Date(NOW.getTime() + 60_000),
    platform: 'web',
    deviceIdHash: 'h',
    user: { isActive: true, emailVerifiedAt: NOW, role: 'ADMIN' },
  });
  const result = await rotateSession({ token: 't' }, deps);
  assert.equal(result.status, 'rotated');
  assert.deepEqual(created, [
    { platform: 'web', deviceIdHash: 'h', expiresInDays: ADMIN_SESSION_DAYS.web },
  ]);
});

test('an unbound admin session cannot be refreshed into a new one', async () => {
  const { deps, created } = rotationDeps({
    id: 's1',
    userId: admin.id,
    revokedAt: null,
    expiresAt: new Date(NOW.getTime() + 60_000),
    platform: null,
    deviceIdHash: null,
    user: { isActive: true, emailVerifiedAt: NOW, role: 'ADMIN' },
  });
  const result = await rotateSession({ token: 't' }, deps);
  assert.equal(result.status, 'unauthorized');
  assert.deepEqual(created, []);
});

test('emails are masked and devices described for the admin', () => {
  assert.equal(maskEmail('lehieu@gmail.com'), 'l***u@gmail.com');
  assert.equal(
    describeDevice(
      'web',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36',
    ),
    'Chrome trên macOS',
  );
  assert.equal(describeDevice('mobile', 'Dart/3.8'), 'Ứng dụng điện thoại');
});
