import test from 'node:test';
import assert from 'node:assert/strict';

import { pickSessionToken } from '../lib/session';

/**
 * getSession() must resolve the presented auth token with Bearer first,
 * cookie fallback — non-browser clients (mobile app) authenticate with a
 * Bearer token while browsers keep the httpOnly `bakery_session` cookie.
 * This pins the priority + tolerance rules for that decision.
 */
test('Bearer header wins over the session cookie', () => {
  assert.equal(pickSessionToken('Bearer abc123', 'cookie-token'), 'abc123');
});

test('cookie is used when no Authorization header is present', () => {
  assert.equal(pickSessionToken(null, 'cookie-token'), 'cookie-token');
  assert.equal(pickSessionToken(undefined, 'cookie-token'), 'cookie-token');
  assert.equal(pickSessionToken('', 'cookie-token'), 'cookie-token');
});

test('malformed or empty Bearer values fall back to the cookie', () => {
  assert.equal(pickSessionToken('Bearerabc', 'cookie-token'), 'cookie-token');
  assert.equal(pickSessionToken('Bearer ', 'cookie-token'), 'cookie-token');
  assert.equal(pickSessionToken('Bearer   ', 'cookie-token'), 'cookie-token');
  assert.equal(pickSessionToken('Basic abc', 'cookie-token'), 'cookie-token');
});

test('Bearer with surrounding whitespace is trimmed, not dropped', () => {
  assert.equal(
    pickSessionToken('Bearer  abc123  ', 'cookie-token'),
    'abc123',
  );
});

test('no token anywhere resolves to null (anonymous request)', () => {
  assert.equal(pickSessionToken(null, undefined), null);
  assert.equal(pickSessionToken(null, ''), null);
  assert.equal(pickSessionToken('Bearer ', undefined), null);
});
