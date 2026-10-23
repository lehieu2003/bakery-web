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
  assert.equal(shouldKeepIdempotencyKey(null), true);
});

test('a 5xx keeps the Idempotency-Key: the order may already exist', () => {
  assert.equal(shouldKeepIdempotencyKey(500), true);
  assert.equal(shouldKeepIdempotencyKey(504), true);
});

test('a 4xx drops the Idempotency-Key: no order was created', () => {
  assert.equal(shouldKeepIdempotencyKey(400), false);
  assert.equal(shouldKeepIdempotencyKey(409), false);
});
