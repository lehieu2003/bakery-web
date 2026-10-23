/**
 * Whether a failed place-order attempt keeps its Idempotency-Key. Only an
 * error the server answered with ([hasServerResponse]) proves no order was
 * created; a network failure may have landed, and resending the same key
 * returns that order instead of a duplicate.
 */
export function shouldKeepIdempotencyKey(hasServerResponse: boolean): boolean {
  return !hasServerResponse;
}

export function canSubmitOrderRequest(options: {
  isSubmitting: boolean;
  hasInFlightRequest: boolean;
}): boolean {
  return !options.isSubmitting && !options.hasInFlightRequest;
}

