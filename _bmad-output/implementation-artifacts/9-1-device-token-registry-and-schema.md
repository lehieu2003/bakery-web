# Story 9.1: Device Token Registry and Schema

Status: review

## Story

As an authenticated customer,  
I want my device push token registered and revocable,  
so that the system can target my active devices reliably.

## Acceptance Criteria

1. Given I am an authenticated user on a supported client, when I register a device token, then the system stores or updates token metadata idempotently per user/device.
2. Given I revoke a device token, when revocation is processed, then only the targeted token is deactivated or removed and other active tokens remain unaffected.

## Tasks / Subtasks

- [x] Add persistence models for push token lifecycle (AC: 1, 2)
  - [x] Update `prisma/schema.prisma` with `DeviceToken` model and supporting indexes/constraints.
  - [x] Add `PushNotificationLog` model scaffold for downstream stories (9.2/9.3) without breaking existing notification flows.
  - [x] Create matching Prisma migration under `prisma/migrations/` and preserve existing migrations unchanged.
  - [x] Regenerate Prisma client after schema update.

- [x] Implement authenticated token registry API (AC: 1, 2)
  - [x] Add `POST /api/notifications/device-token` for create/upsert token registration.
  - [x] Add `DELETE /api/notifications/device-token` for token revocation/deactivation.
  - [x] Enforce auth via existing session/RBAC utilities and return standardized envelope (`success/data/error`).
  - [x] Validate request payloads (token, platform, deviceId/appVersion optional metadata) with explicit server-side guards.

- [x] Add domain-level idempotency and isolation rules (AC: 1, 2)
  - [x] Ensure repeated registration of same token for same user is idempotent (update metadata, no duplicates).
  - [x] Prevent cross-user token collisions from creating invalid duplicates.
  - [x] Ensure revoke operation affects only provided token scope and not sibling tokens.

- [x] Add regression and contract tests (AC: 1, 2)
  - [x] Add route-level tests under `tests/notifications/` covering:
  - [x] unauthenticated request -> `401`
  - [x] first registration -> success
  - [x] repeated registration -> idempotent success/no duplicate
  - [x] revoke existing token -> success
  - [x] revoke unknown token -> safe success or deterministic not-found behavior (as specified)
  - [x] Assert envelope shape remains `success/data/error` for both success and error responses.

## Dev Notes

- Scope boundaries:
  - In scope: schema + migration + authenticated API endpoints + tests for token register/revoke path.
  - Out of scope: Firebase dispatch execution (Story 9.2) and retry/ops policy hardening (Story 9.3).

- Reuse-first guidance (do not duplicate):
  - Keep API response helpers from `lib/api-response.ts`.
  - Reuse auth enforcement patterns from existing notifications routes and `lib/rbac.ts`.
  - Reuse existing notification module organization (`app/api/notifications/**`, `tests/notifications/**`).

- Architecture guardrails:
  - Preserve route -> service/domain utility -> Prisma layering.
  - Preserve backward-compatible API contracts and status mapping.
  - Keep Prisma as single migration source of truth; never edit old migrations.
  - Keep changes additive so existing in-app/email notification flow is unaffected.

- Data modeling requirements:
  - DeviceToken should support: user linkage, token value, active state, metadata, created/updated timestamps.
  - Enforce uniqueness and indexes for efficient user lookup and idempotent updates.
  - Prepare PushNotificationLog in additive way for later stories without wiring dispatch yet.

- Security requirements:
  - Token registration/revocation must require authenticated user context.
  - No token operations allowed for other users.
  - Do not leak sensitive internals in error responses.

### Project Structure Notes

- Primary file touch points:
  - `prisma/schema.prisma`
  - `prisma/migrations/*/migration.sql`
  - `app/api/notifications/device-token/route.ts`
  - `tests/notifications/*device-token*.test.ts` (or update existing notification route suites)
- Keep naming consistent with current route/service/test conventions.

### Testing Requirements

- Minimum validation gate before moving to review:
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Story-level checks:
  - idempotent registration behavior
  - isolated revocation behavior
  - authenticated access enforcement
  - API envelope compatibility

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 9, Story 9.1)
- Change proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-04.md`
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR25, NFR20, NFR21, NFR22)
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md` (API consistency, layering, Prisma migration discipline)
- Project sync rule: `_bmad-output/project-context.md` (backend/frontend sync expectations)
- Existing implementation patterns:
  - `app/api/notifications/route.ts`
  - `app/api/notifications/[id]/read/route.ts`
  - `lib/notifications/dispatcher.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Selected explicit target from user input: Story 9.1.
- Loaded planning/architecture/sprint artifacts and Epic 9 acceptance criteria.
- Reused existing story artifact format and module boundaries from completed stories.
- Updated sprint tracking state to `in-progress` before implementation.
- Added Prisma schema models: `DeviceToken` and `PushNotificationLog`.
- Added migration `prisma/migrations/20260504115500_story_9_1_device_tokens/migration.sql`.
- Implemented token registry route handlers in `app/api/notifications/device-token/route.ts`.
- Added route-level tests in `tests/notifications/device-token-route.test.ts`.
- Executed validation:
  - `npx tsx --test tests/notifications/device-token-route.test.ts` (pass)
  - `npx prisma generate` (pass)
  - `npm run lint` (pass with existing warning in unrelated file)
  - `npm test` (node tests pass; existing known vitest worker error persists)
  - `npm run build` (pass)

### Completion Notes List

- Implemented DeviceToken and PushNotificationLog schema support with additive migration.
- Added authenticated device token register/revoke API with idempotent upsert and scoped deactivation behavior.
- Added contract-focused route tests for auth, payload validation, idempotent registration, and safe revoke behavior.
- Preserved existing notification/event flows; no Firebase dispatch wiring introduced in Story 9.1.
- Full build passed; vitest failure remains pre-existing and unrelated to this story change.

### File List

- _bmad-output/implementation-artifacts/9-1-device-token-registry-and-schema.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- prisma/schema.prisma
- prisma/migrations/20260504115500_story_9_1_device_tokens/migration.sql
- app/api/notifications/device-token/route.ts
- tests/notifications/device-token-route.test.ts

## Change Log

- 2026-05-04: Created Story 9.1 context file and marked status `ready-for-dev`.
- 2026-05-04: Implemented Story 9.1 schema, migration, device-token API, and route tests; marked story `review`.

## Story Context Status

- Ready for review (`review`).
