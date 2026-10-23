/**
 * Whether a failed place-order attempt keeps its Idempotency-Key, given the
 * HTTP status it failed with (null: no answer at all). Only a 4xx proves no
 * order was created. Without an answer, or with a 5xx — e.g. a 504 after
 * the handler ran — the order may exist, and resending the same key returns
 * it instead of creating a duplicate.
 */
export function shouldKeepIdempotencyKey(status: number | null): boolean {
  return status === null || status >= 500;
}

export function canSubmitOrderRequest(options: {
  isSubmitting: boolean;
  hasInFlightRequest: boolean;
}): boolean {
  return !options.isSubmitting && !options.hasInFlightRequest;
}

