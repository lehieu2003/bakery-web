import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOAuthState,
  getGoogleOAuthUrl,
  getAppUrl,
} from '@/lib/auth/google-oauth';
import { canAuthenticateWithPassword } from '@/lib/auth/login-policy';
import { assertGoogleEmailVerified } from '@/lib/auth/google-oauth';

test('assertGoogleEmailVerified only accepts an email Google marked verified', () => {
  const info = { sub: 's1', email: 'customer@example.com' };

  assert.doesNotThrow(() => assertGoogleEmailVerified({ ...info, email_verified: true }));
  assert.throws(() => assertGoogleEmailVerified({ ...info, email_verified: false }));
  assert.throws(() => assertGoogleEmailVerified(info));
});

test('generateOAuthState creates high-entropy random state', () => {
  const state1 = generateOAuthState();
  const state2 = generateOAuthState();

  assert.ok(state1 && state1.length >= 32);
  assert.notEqual(state1, state2);
});

test('getGoogleOAuthUrl generates correct oauth url', () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

  const appUrl = 'https://example.com';
  const state = 'test-random-state-12345';
  const url = getGoogleOAuthUrl(appUrl, state);

  assert.ok(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('client_id'), 'test-client-id.apps.googleusercontent.com');
  assert.equal(parsed.searchParams.get('redirect_uri'), 'https://example.com/api/auth/google/callback');
  assert.equal(parsed.searchParams.get('response_type'), 'code');
  assert.equal(parsed.searchParams.get('state'), state);
  assert.equal(parsed.searchParams.get('scope'), 'openid email profile');
});

test('getAppUrl extracts forwarding host when provided', () => {
  const headers = new Map([
    ['x-forwarded-host', 'phuong-loan-bakery.vercel.app'],
    ['x-forwarded-proto', 'https'],
  ]);
  const fakeRequest = {
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
    nextUrl: new URL('http://localhost:3000'),
  } as unknown as Parameters<typeof getAppUrl>[0];

  const url = getAppUrl(fakeRequest);
  assert.equal(url, 'https://phuong-loan-bakery.vercel.app');
});

test('OAuth accounts with null password cannot log in with standard password flow', () => {
  const googleUser = {
    password: null,
    emailVerifiedAt: new Date(),
    isActive: true,
  };

  assert.equal(canAuthenticateWithPassword(googleUser), false);
});
