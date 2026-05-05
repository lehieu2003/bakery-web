import test from 'node:test';
import assert from 'node:assert/strict';
import { mapMulticastResponses } from '@/lib/notifications/firebase';

test('mapMulticastResponses classifies success, permanent and retryable token outcomes', () => {
  const tokens = ['ok-token', 'dead-token', 'timeout-token'];
  const result = mapMulticastResponses(tokens, [
    { success: true },
    {
      success: false,
      error: { code: 'messaging/registration-token-not-registered' },
    },
    {
      success: false,
      error: { code: 'messaging/internal-error' },
    },
  ]);

  assert.deepEqual(result.successfulTokens, ['ok-token']);
  assert.deepEqual(result.permanentFailureTokens, ['dead-token']);
  assert.deepEqual(result.retryableFailureTokens, ['timeout-token']);
});

test('mapMulticastResponses treats invalid registration token as permanent failure', () => {
  const result = mapMulticastResponses(['bad-token'], [
    {
      success: false,
      error: { code: 'messaging/invalid-registration-token' },
    },
  ]);

  assert.deepEqual(result.successfulTokens, []);
  assert.deepEqual(result.permanentFailureTokens, ['bad-token']);
  assert.deepEqual(result.retryableFailureTokens, []);
});
