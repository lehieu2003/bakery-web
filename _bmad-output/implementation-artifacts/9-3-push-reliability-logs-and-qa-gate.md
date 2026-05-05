# Story 9.3: Push Reliability, Logs, and QA Gate

Status: review

## Story

As an operations and QA stakeholder,  
I want push delivery attempts fully logged and validated,  
so that release risk is controlled and failures are diagnosable.

## Acceptance Criteria

1. Given push delivery attempts are processed, when success, partial failure, or provider errors occur, then attempt outcomes are persisted with actionable diagnostics.
2. Given release gates run for push-related changes, when automated tests and staging smoke checks execute, then multi-device fan-out and replay scenarios are validated before release.

## Tasks / Subtasks

- [x] Harden push-attempt logging model and write path (AC: 1)
  - [x] Ensure `PushNotificationLog` captures correlation key, provider response class, token-level outcome summary, retryability, and timestamps.
  - [x] Persist logs for success, partial failure, and full failure paths in `lib/notifications/dispatcher.ts` without changing existing API response envelopes.
  - [x] Keep diagnostics actionable but safe (no secrets, no raw credential material, no oversized provider payload dumps).

- [x] Add deterministic error taxonomy and reliability signals (AC: 1)
  - [x] Normalize push provider errors into stable categories (transient, permanent-token, provider-outage, unknown).
  - [x] Record correlation metadata (`orderId`, `transactionId`, `attempt`) to align with architecture observability conventions.
  - [x] Expose operationally useful log fields for troubleshooting and QA verification.

- [x] Define and enforce QA gate coverage for push dispatch (AC: 2)
  - [x] Extend automated tests to cover multi-device fan-out, partial failures, full provider failure, and duplicate replay idempotency.
  - [x] Add/refresh route-level integration tests for at least one transactional trigger path (`momo` or `zalopay` callback) asserting push diagnostics flow.
  - [x] Add a staging smoke checklist for replay-safe dispatch and token-deactivation behavior.

- [x] Preserve compatibility and non-regression guarantees (AC: 1, 2)
  - [x] Keep existing in-app/email notification behavior unchanged.
  - [x] Maintain `success/data/error` response contract for all touched routes.
  - [x] Keep push reliability work additive; avoid unrelated schema or API contract churn.

## Dev Notes

- Scope boundaries:
  - In scope: reliability logging completeness, error categorization, QA gate automation/smoke process for transactional push.
  - Out of scope: new notification channels, campaign targeting redesign, broad observability platform rollout.

- Reuse-first guidance (do not duplicate):
  - Reuse existing dispatch/idempotency flow in `lib/notifications/dispatcher.ts` (`NotificationDispatch.correlationKey`).
  - Reuse persistence models from Story 9.1 (`DeviceToken`, `PushNotificationLog`).
  - Reuse Firebase adapter and token outcome handling from Story 9.2 (`lib/notifications/firebase.ts`).
  - Reuse API helpers from `lib/api-response.ts` and existing payment callback patterns.

- Architecture guardrails:
  - Preserve route handler -> domain service/dispatcher -> Prisma layering.
  - Keep notification workload isolated from checkout critical path (NFR16).
  - Maintain stable API contract and version safety (NFR22).
  - Keep failure handling operationally visible (NFR20, NFR21).

- Data/logging guidance:
  - `PushNotificationLog` entries should include enough context to diagnose "who/what/when/why failed" without storing secrets.
  - Prefer structured fields over free-text blobs; keep enums/messages stable for downstream tooling.
  - Token-level invalidation events must remain auditable and tied to dispatch attempt context.

### Project Structure Notes

- Expected touch points:
  - `lib/notifications/dispatcher.ts`
  - `lib/notifications/firebase.ts`
  - `tests/notifications/dispatcher.test.ts`
  - `tests/notifications/firebase-push.test.ts`
  - `tests/payment/*callback-route.test.ts` (targeted replay/smoke assertions)
  - `prisma/schema.prisma` and new migration only if additional log fields are truly required

### Testing Requirements

- Required verification gate:
  - `npm run lint`
  - `npm test`
  - `npm run build`

- Story-specific checks:
  - Multi-token dispatch logs success/partial/full-failure outcomes deterministically.
  - Duplicate replay for same correlation key does not create duplicate provider sends.
  - Permanent-invalid token path is logged and token deactivation is persisted.
  - Existing notification/channel tests remain green.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 9, Story 9.3)
- Prior story intelligence:
  - `_bmad-output/implementation-artifacts/9-1-device-token-registry-and-schema.md`
  - `_bmad-output/implementation-artifacts/9-2-transactional-firebase-push-dispatch.md`
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md`
- Reliability/contract requirements: `_bmad-output/planning-artifacts/prd.md` (FR25, NFR20, NFR21, NFR22)
- Related change rationale: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-04.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Loaded create-story workflow/template/checklist and BMAD config.
- Parsed explicit user target `9-3`.
- Analyzed Epic 9 + Story 9.3 acceptance criteria in planning artifacts.
- Reviewed previous story context files (9.1, 9.2) for implementation continuity.
- Mapped architecture and PRD constraints to push reliability/logging guardrails.
- Updated sprint tracker status from `ready-for-dev` to `in-progress` for story execution.
- Added red-phase assertions in dispatcher tests for push diagnostics taxonomy and correlation metadata.
- Implemented push response classification and structured log metadata in `lib/notifications/dispatcher.ts`.
- Added callback-route integration assertions for correlation key and push diagnostics payload fields.
- Added staging smoke validation checklist for replay and token-deactivation scenarios.
- Executed validation commands: `npm run lint`, `npm test`, `npm run build` (build passed after one transient Prisma file-lock retry).

### Completion Notes List

- Added deterministic push provider response classes (`SUCCESS`, `PARTIAL_FAILURE`, `TOTAL_FAILURE`, `SKIPPED`) to dispatch logging.
- Added structured diagnostics metadata to `PushNotificationLog` rows (`providerResponseClass`, `retryable`, `orderId`, `transactionId`, `attempt`, `loggedAt`).
- Preserved idempotent dispatch behavior and existing in-app/email channel semantics while extending push diagnostics.
- Expanded automated coverage for partial/full push failure diagnostics and callback payload traceability.
- Added staging smoke checklist for multi-device fan-out, replay safety, and invalid-token deactivation checks.
- Story tasks complete and moved to `review`.

### File List

- _bmad-output/implementation-artifacts/9-3-push-reliability-logs-and-qa-gate.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- lib/notifications/dispatcher.ts
- tests/notifications/dispatcher.test.ts
- tests/payment/momo-callback-route.test.ts
- tests/notifications/push-staging-smoke-checklist.md

## Change Log

- 2026-05-04: Implemented Story 9.3 push reliability diagnostics and QA gate coverage; set story status to `review`.

## Story Context Status

- Ready for review (`review`).
