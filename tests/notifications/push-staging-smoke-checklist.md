# Push Dispatch Staging Smoke Checklist

## Preconditions
- `PUSH_TX_ENABLED=true` in staging runtime.
- Firebase service account vars are configured (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- Test user has at least two active `DeviceToken` rows.

## Smoke Steps
1. Trigger one transactional callback (`momo` or `zalopay`) for an order bound to the test user.
2. Verify dispatch record exists for correlation key `order:{orderId}:status:{status}:{transactionId}`.
3. Confirm at least one `PushNotificationLog` row exists with matching `correlationKey`.
4. Validate `PushNotificationLog.metadata` includes:
   - `providerResponseClass`
   - `retryable`
   - `orderId`
   - `transactionId`
   - `loggedAt`
5. Replay the same callback payload and verify no duplicate provider send attempts occur.
6. Simulate one invalid token and verify:
   - token is deactivated (`isActive=false`, `deactivatedAt` set)
   - push logs still contain successful token outcomes.

## Pass Criteria
- Multi-device fan-out executes with deterministic logs.
- Replay remains idempotent.
- Permanent token failures are isolated and auditable.
- No regression in API response envelope (`success/data/error`) for affected routes.
