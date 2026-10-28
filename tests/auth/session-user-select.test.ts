import test from 'node:test';
import assert from 'node:assert/strict';
import { USER_SELECT } from '@/lib/session';

test('the session user carries the phone number', () => {
  // GET /api/auth/me and the login responses read the user through this
  // select. Without phone the app showed the saved number as empty, and the
  // next profile save sent the blank back, erasing it.
  assert.equal(USER_SELECT.phone, true);
});
