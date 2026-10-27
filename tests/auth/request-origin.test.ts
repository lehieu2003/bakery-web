import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCredentialRequest } from '@/lib/auth/request-origin';

function loginRequest(headers: Record<string, string>) {
  return new Request('https://bakery.example/api/auth/login', {
    method: 'POST',
    headers: { host: 'bakery.example', ...headers },
    body: '{}',
  });
}

test('same-origin JSON login passes', () => {
  assert.deepEqual(
    checkCredentialRequest(
      loginRequest({ 'content-type': 'application/json', origin: 'https://bakery.example' }),
    ),
    { ok: true },
  );
});

test('native clients without an Origin header pass', () => {
  assert.deepEqual(
    checkCredentialRequest(loginRequest({ 'content-type': 'application/json; charset=utf-8' })),
    { ok: true },
  );
});

test('a cross-site origin is rejected', () => {
  assert.deepEqual(
    checkCredentialRequest(
      loginRequest({ 'content-type': 'application/json', origin: 'https://evil.example' }),
    ),
    { ok: false, status: 403 },
  );
});

test('a form-encodable content type is rejected', () => {
  for (const contentType of ['text/plain', 'application/x-www-form-urlencoded']) {
    assert.deepEqual(
      checkCredentialRequest(loginRequest({ 'content-type': contentType })),
      { ok: false, status: 415 },
    );
  }
});
