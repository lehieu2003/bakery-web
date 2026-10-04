import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { hashSessionToken } from '@/lib/auth/session-hash';

// SHA-256('abc') pinned as a literal so an algorithm, encoding, or
// truncation change cannot slip through unnoticed.
const ABC_SHA256 =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

test('hashSessionToken returns the SHA-256 hex digest of the token', () => {
  assert.equal(hashSessionToken('abc'), ABC_SHA256);
  assert.equal(hashSessionToken('abc'), sha256Hex('abc'));
});

test('hashSessionToken is deterministic across calls', () => {
  const first = hashSessionToken('token-current');
  const second = hashSessionToken('token-current');
  assert.equal(first, second);
});

test('hashSessionToken output is exactly 64 lowercase hex characters', () => {
  for (const token of [
    'abc',
    '',
    'x'.repeat(64),
    'tokên-unicode-🥐',
    'a'.repeat(1000),
  ]) {
    assert.match(hashSessionToken(token), /^[0-9a-f]{64}$/);
  }
});

test('hashSessionToken output differs from its input', () => {
  const raw = 'token-current';
  const hash = hashSessionToken(raw);
  assert.notEqual(hash, raw);
  assert.notEqual(hashSessionToken('token-current'), hashSessionToken('token-current-2'));
});

test('hashing a raw 64-hex session token produces a different 64-hex digest', () => {
  // A generated session token is already 64 hex chars (randomBytes(32).hex);
  // the hash must still change it so raw tokens can never match at rest.
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = hashSessionToken(raw);
  assert.match(raw, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, raw);
  assert.equal(hash, sha256Hex(raw));
});
