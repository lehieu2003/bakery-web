export function canSubmitOrderRequest(options: {
  isSubmitting: boolean;
  hasInFlightRequest: boolean;
}): boolean {
  return !options.isSubmitting && !options.hasInFlightRequest;
}

