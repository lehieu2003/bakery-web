import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAuthRateLimit,
  resetIpRateLimit,
  __resetIpRateLimitForTests,
} from '@/lib/rate-limit';

function authRequest(ip: string): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  });
}

test('auth-login allows 10 attempts then blocks the 11th with 429', () => {
  __resetIpRateLimitForTests();
  const request = authRequest('203.0.113.10');

  for (let attempt = 1; attempt <= 10; attempt++) {
    assert.equal(checkAuthRateLimit(request, 'auth-login'), null);
  }

  const rejection = checkAuthRateLimit(request, 'auth-login');
  assert.ok(rejection, 'expected the 11th attempt to be rejected');
  assert.equal(rejection.status, 429);
  assert.ok(rejection.retryAfterSec > 0);
});

test('auth-register allows 5 attempts then blocks the 6th with 429', () => {
  __resetIpRateLimitForTests();
  const request = authRequest('203.0.113.11');

  for (let attempt = 1; attempt <= 5; attempt++) {
    assert.equal(checkAuthRateLimit(request, 'auth-register'), null);
  }

  const rejection = checkAuthRateLimit(request, 'auth-register');
  assert.ok(rejection, 'expected the 6th attempt to be rejected');
  assert.equal(rejection.status, 429);
  assert.ok(rejection.retryAfterSec > 0);
});

test('auth-otp allows 10 attempts then blocks the 11th with 429', () => {
  __resetIpRateLimitForTests();
  const request = authRequest('203.0.113.12');

  for (let attempt = 1; attempt <= 10; attempt++) {
    assert.equal(checkAuthRateLimit(request, 'auth-otp'), null);
  }

  const rejection = checkAuthRateLimit(request, 'auth-otp');
  assert.ok(rejection, 'expected the 11th attempt to be rejected');
  assert.equal(rejection.status, 429);
  assert.ok(rejection.retryAfterSec > 0);
});

test('auth scopes are isolated for the same IP', () => {
  __resetIpRateLimitForTests();
  const request = authRequest('203.0.113.13');

  for (let attempt = 1; attempt <= 10; attempt++) {
    assert.equal(checkAuthRateLimit(request, 'auth-login'), null);
  }
  assert.equal(checkAuthRateLimit(request, 'auth-login')?.status, 429);

  assert.equal(checkAuthRateLimit(request, 'auth-otp'), null);
  assert.equal(checkAuthRateLimit(request, 'auth-register'), null);
});

test('one IP exhausting a budget does not throttle another IP', () => {
  __resetIpRateLimitForTests();
  const attacker = authRequest('203.0.113.14');
  const customer = authRequest('203.0.113.15');

  for (let attempt = 1; attempt <= 10; attempt++) {
    assert.equal(checkAuthRateLimit(attacker, 'auth-login'), null);
  }
  assert.equal(checkAuthRateLimit(attacker, 'auth-login')?.status, 429);
  assert.equal(checkAuthRateLimit(customer, 'auth-login'), null);
});

test('resetIpRateLimit clears the failed-attempt budget after a successful login', () => {
  __resetIpRateLimitForTests();
  const request = authRequest('203.0.113.16');

  for (let attempt = 1; attempt <= 10; attempt++) {
    assert.equal(checkAuthRateLimit(request, 'auth-login'), null);
  }
  assert.equal(checkAuthRateLimit(request, 'auth-login')?.status, 429);

  // The login route calls this after a successful credential verify so the
  // auth-login budget only accumulates failed attempts.
  resetIpRateLimit('203.0.113.16', 'auth-login');
  assert.equal(checkAuthRateLimit(request, 'auth-login'), null);
});
