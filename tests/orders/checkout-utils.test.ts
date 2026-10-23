import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSubmitOrderRequest,
  shouldKeepIdempotencyKey,
} from '@/lib/checkout-utils';

test('canSubmitOrderRequest allows submission when not submitting and no in-flight request', () => {
  assert.equal(
    canSubmitOrderRequest({ isSubmitting: false, hasInFlightRequest: false }),
    true,
  );
});

test('canSubmitOrderRequest blocks submission when submitting flag is true', () => {
  assert.equal(
    canSubmitOrderRequest({ isSubmitting: true, hasInFlightRequest: false }),
    false,
  );
});

test('canSubmitOrderRequest blocks submission when in-flight request exists', () => {
  assert.equal(
    canSubmitOrderRequest({ isSubmitting: false, hasInFlightRequest: true }),
    false,
  );
});

test('a network failure keeps the Idempotency-Key so the retry replays', () => {
  assert.equal(shouldKeepIdempotencyKey(false), true);
});

test('a server-answered failure drops the Idempotency-Key', () => {
  assert.equal(shouldKeepIdempotencyKey(true), false);
});
