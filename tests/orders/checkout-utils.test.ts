import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitOrderRequest } from '@/lib/checkout-utils';

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
