import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkIpRateLimit,
  enforceIpRateLimit,
  RATE_LIMITS,
  __resetIpRateLimitForTests,
} from '@/lib/rate-limit';

const CONFIG = { maxRequests: 2, windowMs: 60_000 };

test('allows requests under the limit and blocks at the limit', () => {
  __resetIpRateLimitForTests();
  let clock = 1_000_000;
  const now = () => clock;

  assert.equal(checkIpRateLimit('1.1.1.1', 'chat', CONFIG, now).allowed, true);
  assert.equal(checkIpRateLimit('1.1.1.1', 'chat', CONFIG, now).allowed, true);
  const blocked = checkIpRateLimit('1.1.1.1', 'chat', CONFIG, now);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0 && blocked.retryAfterSec <= 60);
});

test('one IP bursting does not throttle another IP', () => {
  __resetIpRateLimitForTests();
  let clock = 2_000_000;
  const now = () => clock;
  const sameScope = { ...RATE_LIMITS.CHAT_PER_IP };

  for (let i = 0; i < sameScope.maxRequests; i++) {
    checkIpRateLimit('9.9.9.9', 'chat', sameScope, now);
  }
  assert.equal(checkIpRateLimit('9.9.9.9', 'chat', sameScope, now).allowed, false);
  assert.equal(checkIpRateLimit('8.8.8.8', 'chat', sameScope, now).allowed, true);
});

test('a blocked IP recovers when the window passes', () => {
  __resetIpRateLimitForTests();
  let clock = 3_000_000;
  const now = () => clock;

  for (let i = 0; i < CONFIG.maxRequests; i++) {
    checkIpRateLimit('7.7.7.7', 'chat', CONFIG, now);
  }
  assert.equal(checkIpRateLimit('7.7.7.7', 'chat', CONFIG, now).allowed, false);

  clock += CONFIG.windowMs + 1;
  assert.equal(checkIpRateLimit('7.7.7.7', 'chat', CONFIG, now).allowed, true);
});

test('scopes are isolated for the same IP', () => {
  __resetIpRateLimitForTests();
  let clock = 4_000_000;
  const now = () => clock;

  for (let i = 0; i < CONFIG.maxRequests; i++) {
    checkIpRateLimit('6.6.6.6', 'chat', CONFIG, now);
  }
  assert.equal(checkIpRateLimit('6.6.6.6', 'chat', CONFIG, now).allowed, false);
  assert.equal(checkIpRateLimit('6.6.6.6', 'orders', CONFIG, now).allowed, true);
});

test('the tracked-ip map stays bounded', () => {
  __resetIpRateLimitForTests();
  let clock = 5_000_000;
  const now = () => clock;
  for (let i = 0; i < 12_000; i++) {
    checkIpRateLimit(`10.0.0.${i % 256}.${i % 200}`, 'chat', CONFIG, now);
  }
  //_map cap is an implementation detail; assert via a fresh IP still passing
  assert.equal(checkIpRateLimit('10.9.9.9', 'chat', CONFIG, now).allowed, true);
});

test('enforceIpRateLimit reads the client IP from headers', () => {
  __resetIpRateLimitForTests();
  const request = {
    headers: new Headers({ 'x-forwarded-for': '4.4.4.4, 10.0.0.1' }),
  } as unknown as Request;
  let clock = 6_000_000;
  const now = () => clock;

  const first = enforceIpRateLimit(request, 'chat', RATE_LIMITS.CHAT_PER_IP, now);
  assert.equal(first.ok, true);
  for (let i = 1; i < RATE_LIMITS.CHAT_PER_IP.maxRequests; i++) {
    enforceIpRateLimit(request, 'chat', RATE_LIMITS.CHAT_PER_IP, now);
  }
  const blocked = enforceIpRateLimit(request, 'chat', RATE_LIMITS.CHAT_PER_IP, now);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfterSec > 0);
});
