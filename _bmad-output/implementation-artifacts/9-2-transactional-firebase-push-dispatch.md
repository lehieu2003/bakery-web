# Story 9.2: Transactional Firebase Push Dispatch

Status: review

## Story

As the platform,  
I want to dispatch transactional push notifications for order/payment events,  
so that customers receive timely, device-level updates.

## Acceptance Criteria

1. Given a supported transactional event occurs, when dispatch is triggered, then Firebase FCM is called for all active tokens of the target user.
2. Given duplicate dispatch attempts for the same transactional event, when processing repeats, then idempotency controls prevent duplicate push delivery.

## Tasks / Subtasks

- [x] Add Firebase push channel adapter behind feature flag (AC: 1)
  - [x] Add Firebase Admin SDK dependency and initialize singleton adapter in `lib/notifications/` with env-validated credentials.
  - [x] Gate push dispatch with `PUSH_TX_ENABLED` (default off in non-configured environments).
  - [x] Implement token fan-out send function that targets all active tokens from `DeviceToken` for the user.

- [x] Integrate push dispatch into existing notification pipeline (AC: 1, 2)
  - [x] Extend `lib/notifications/dispatcher.ts` dispatch lifecycle to include FCM send path for transactional events.
  - [x] Reuse existing correlation-key idempotency entrypoint (`NotificationDispatch.correlationKey`) rather than introducing parallel idempotency state.
  - [x] Ensure push channel integration is additive and does not regress in-app/email dispatch behavior.

- [x] Add transactional event wiring for order/payment lifecycle (AC: 1, 2)
  - [x] Trigger push-capable dispatch from current order/payment event producers using existing event types and correlation-key conventions.
  - [x] Ensure event payload mapping includes safe title/body/link metadata for push content.
  - [x] Preserve standardized API response envelope (`success/data/error`) on all impacted route handlers.

- [x] Handle invalid tokens and partial failures safely (AC: 1)
  - [x] Classify provider errors into retryable vs non-retryable categories.
  - [x] Deactivate tokens that are permanently invalid (without impacting other active tokens).
  - [x] Record per-attempt outcome scaffolding in `PushNotificationLog` for Story 9.3 deep reliability work.

- [x] Add automated tests for dispatch and idempotency (AC: 1, 2)
  - [x] Extend `tests/notifications/dispatcher.test.ts` with push fan-out, partial failure, and duplicate replay coverage.
  - [x] Add focused tests for Firebase adapter behavior with mocked provider responses.
  - [x] Add route/service integration coverage for at least one order/payment event that triggers push dispatch.

## Dev Notes

- Scope boundaries:
  - In scope: transactional push dispatch service, event wiring, idempotent replay protection reuse, token fan-out behavior, and regression-safe tests.
  - Out of scope: advanced retry governance, alerting thresholds, and release QA gate formalization (Story 9.3).

- Reuse-first guidance (do not duplicate):
  - Reuse dispatch lifecycle and idempotency from `lib/notifications/dispatcher.ts` and `NotificationDispatch` model.
  - Reuse token registry data from `DeviceToken` created in Story 9.1.
  - Reuse API response helpers from `lib/api-response.ts` and existing auth/RBAC request patterns.

- Architecture guardrails:
  - Preserve layering: route handlers -> domain dispatch service -> Prisma/integration adapters.
  - Keep Prisma as source of truth; schema/migration changes must be additive and paired.
  - Preserve compatibility with existing in-app/email channels and campaign-triggered paths.

- Firebase integration requirements:
  - Service account secrets must come only from environment variables.
  - Validate required env vars at startup path used by push adapter.
  - No secrets or full provider payloads in user-facing error responses.

- Idempotency and event key policy:
  - Correlation key must remain deterministic and stable per transactional event.
  - Duplicate trigger path must short-circuit before new provider send attempts.
  - Recommended key pattern continuity: `eventType:entityId:userId[:statusOrPhase]`.

- Token handling requirements:
  - Dispatch targets `DeviceToken` rows where `isActive = true` for the intended user.
  - Invalid/permanently rejected tokens should be deactivated with timestamp for auditability.
  - Do not delete historical token rows in 9.2 unless existing project pattern requires hard-delete.

### Project Structure Notes

- Primary file touch points (expected):
  - `lib/notifications/dispatcher.ts`
  - `lib/notifications/*` (new Firebase adapter module[s])
  - `app/api/payment/**/route.ts` and/or related order-status event producer routes
  - `tests/notifications/dispatcher.test.ts`
  - `tests/notifications/*` (new push-dispatch coverage)
  - `types/api.types.ts` only if contract payloads are expanded

### Testing Requirements

- Minimum validation gate before moving to `review`:
  - `npm run lint`
  - `npm test`
  - `npm run build`

- Story-specific checks:
  - Active-token fan-out dispatch to multiple devices.
  - Replay of same correlation key does not create duplicate push sends.
  - Partial token failure does not block successful delivery to other active tokens.
  - Existing in-app/email dispatch tests remain green.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 9, Story 9.2)
- Prior story intelligence: `_bmad-output/implementation-artifacts/9-1-device-token-registry-and-schema.md`
- Sprint change rationale: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-04.md`
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md` (layering, API contract consistency, idempotent transactional flows)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR25, NFR20, NFR21, NFR22)
- Existing implementation anchors:
  - `lib/notifications/dispatcher.ts`
  - `app/api/notifications/route.ts`
  - `tests/notifications/dispatcher.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Loaded create-story workflow/template/checklist and project config.
- Parsed full sprint status and selected explicit target `9-2-transactional-firebase-push-dispatch` from user input.
- Analyzed Epic 9, architecture/PRD constraints, sprint change proposal, and Story 9.1 learnings.
- Reviewed existing notification dispatcher, notification routes, schema models, and dispatcher tests to enforce reuse-first guidance.
- Added `firebase-admin` dependency and created Firebase push adapter module with env-gated credential initialization.
- Integrated push fan-out, token deactivation, and push attempt logging into `processNotificationDispatch` while keeping idempotency on `NotificationDispatch.correlationKey`.
- Extended transactional event payloads in payment callback routes to include `linkUrl` and `occurredAt`.
- Executed validation commands: `npm run lint`, `npm test` (node tests pass; known pre-existing vitest/jsdom worker error persists), `npm run build` (pass after transient Prisma file-lock retry and type-fix).

### Completion Notes List

- Created comprehensive Story 9.2 implementation context optimized for additive Firebase push integration.
- Embedded idempotency, token fan-out, failure isolation, and regression protection guardrails.
- Story marked `ready-for-dev` and sprint tracking updated accordingly.
- Implemented Firebase transactional push adapter (`PUSH_TX_ENABLED` + service-account envs) and wired it to notification dispatch.
- Added multi-token push fan-out behavior for order/payment transactional events with permanent token deactivation and push log persistence.
- Preserved existing in-app/email dispatch behavior and idempotent replay short-circuiting.
- Added tests for push dispatch success/partial-failure/full-failure paths and Firebase token outcome classification; updated payment callback tests for push payload link metadata.

### File List

- _bmad-output/implementation-artifacts/9-2-transactional-firebase-push-dispatch.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .env.example
- package.json
- package-lock.json
- lib/notifications/firebase.ts
- lib/notifications/dispatcher.ts
- app/api/payment/momo/callback/route.ts
- app/api/payment/zalopay/callback/route.ts
- tests/notifications/dispatcher.test.ts
- tests/notifications/firebase-push.test.ts
- tests/payment/momo-callback-route.test.ts
- tests/payment/zalopay-callback-route.test.ts

## Change Log

- 2026-05-04: Implemented Story 9.2 Firebase transactional push dispatch, fan-out handling, failure isolation, and tests; moved status to `review`.

## Story Context Status

- Ready for review (`review`).
