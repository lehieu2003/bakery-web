# Story 5.1: Event-Driven Notification Delivery

Status: done

## Story

As a customer,
I want to receive timely notifications for important events,
so that I stay informed about orders and account actions.

## Acceptance Criteria

1. Given a supported event occurs (order update, account event, campaign trigger), when notification dispatch is executed, then the system sends notification payloads through configured channels with retry/fallback behavior.
2. Given notification dispatch attempts fail, when retries are exhausted or provider errors occur, then failure details are logged with actionable context for operations/support.
3. Given notification records are created by event delivery, when users open the notification center, then records are compatible with existing customer notification APIs and read-state lifecycle (`/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all`).
4. Given background notification processing runs under load, when checkout/payment-critical requests are active, then notification workloads remain isolated from critical checkout path performance.

## Tasks / Subtasks

- [x] Define event-to-notification contract and trigger points (AC: 1, 3)
- [x] Enumerate supported event types for MVP: order lifecycle transition, account security event, campaign trigger.
- [x] Standardize event payload shape with required metadata (`eventType`, `entityId`, `userId`, `occurredAt`, correlation/idempotency key).
- [x] Add server-side mapping from domain event -> notification content (`title`, `content`, optional `linkUrl`/`imageUrl`).

- [x] Implement dispatch pipeline with retry/fallback controls (AC: 1, 2, 4)
- [x] Add an application-level dispatcher module in `lib` (queue/job lane compatible), not in UI/hooks/services.
- [x] Implement bounded retry policy for transient provider failures (max attempts + backoff).
- [x] Define fallback behavior per channel (email fallback first; keep extension point for SMS).
- [x] Ensure duplicate event processing is idempotent using correlation key + data constraints.

- [x] Persist notification records compatible with current APIs (AC: 1, 3)
- [x] Reuse existing `Notification` and `NotificationRead` Prisma models; avoid schema forks unless required.
- [x] Create notification rows with lifecycle-consistent status/published timestamp for customer surfaces.
- [x] Keep API response envelope stable (`{ success, data?, error? }`) across touched handlers.

- [x] Add operational observability and failure surfacing (AC: 2)
- [x] Emit structured logs for dispatch start/success/failure with event and correlation identifiers.
- [x] Capture terminal failures with enough context for support investigation without leaking secrets.
- [x] Add lightweight admin/support visibility hook (log/event query path or documented runbook reference).

- [x] Preserve performance and boundary constraints (AC: 4)
- [x] Keep dispatch off the synchronous checkout critical path; hand off to async lane.
- [x] Do not introduce blocking external provider calls inside transaction-critical route handlers.
- [x] Add guardrails for retry storms (attempt cap and dead-letter style terminal state).

- [x] Add regression and route-level tests (AC: 1..4)
- [x] Test successful dispatch path creates/updates expected notification state.
- [x] Test transient failure + retry eventually succeeds.
- [x] Test exhausted retry path logs terminal failure signal.
- [x] Test idempotent replay of same event does not create duplicate user-visible notifications.
- [x] Test compatibility with existing customer notification read endpoints and read counters.

## Dev Notes

- Scope boundaries:
- In scope: event-driven notification dispatch, retry/fallback behavior, operational logging, compatibility with existing notification APIs.
- Out of scope for this story: full notification inbox UX enhancements (handled in Story 5.2), advanced analytics segmentation.

- Existing implementation baseline to build on:
- Customer read APIs already exist: `app/api/notifications/route.ts`, `app/api/notifications/[id]/read/route.ts`, `app/api/notifications/read-all/route.ts`.
- Admin notification CRUD/publish exists: `app/api/admin/notifications/route.ts`, `app/api/admin/notifications/[id]/route.ts`.
- Notification persistence already modeled: `Notification`, `NotificationRead`, `NotificationStatus` in `prisma/schema.prisma`.
- Email integration baseline exists: `lib/email.ts` (`emailService` abstraction).

- Architecture guardrails:
- Preserve route -> lib/domain -> prisma layering; do not place side-effect orchestration in React hooks/components.
- Keep notification async lane separated from checkout/payment-critical flow per architecture reliability constraints.
- Follow idempotency-first design for retryable event processing (correlation key and safe upsert/unique constraints).
- Maintain API contract consistency and non-breaking response shapes for existing clients.

- Latest technical notes (validated against primary docs):
- Next.js route handlers (`route.ts`) support standard HTTP methods and should keep server logic in handler/module boundaries; keep dispatch orchestration in server modules, not client code.
- Prisma guidance emphasizes idempotent API design for retry scenarios; this story should treat duplicate event delivery as expected and safe.

### Project Structure Notes

- Primary touch points (expected):
- `app/api/orders/**` and/or account-event routes that emit supported events
- `app/api/notifications/**` (compatibility validation only; avoid breaking contract)
- `lib/**` new/updated notification dispatch utilities (event mapping, retry/fallback, logging)
- `lib/email.ts` reuse for email channel fallback/dispatch
- `prisma/schema.prisma` only if a minimal constraint/index is required for idempotency
- `tests/**` new route/lib tests for dispatch and replay safety

- Anti-reinvention guidance:
- Reuse existing notification models and admin/customer APIs instead of introducing parallel notification tables/routes.
- Reuse existing `emailService` abstraction before adding provider-specific code.

### Testing Requirements

- Verify supported domain events trigger notification dispatch with expected payload mapping.
- Verify bounded retry behavior for transient failures.
- Verify terminal failure behavior emits actionable operational logs.
- Verify replay of identical event/correlation key is idempotent.
- Verify generated notification records remain readable via existing customer notification endpoints.
- Verify checkout/payment route latency contract is not regressed by synchronous notification calls.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.1)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR25, NFR16, NFR20, NFR21)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (API boundaries, async lane, reliability controls)
- Existing customer notification APIs: `app/api/notifications/route.ts`, `app/api/notifications/[id]/read/route.ts`, `app/api/notifications/read-all/route.ts`
- Existing admin notification APIs: `app/api/admin/notifications/route.ts`, `app/api/admin/notifications/[id]/route.ts`
- Notification schema: `prisma/schema.prisma` (`NotificationStatus`, `Notification`, `NotificationRead`)
- Existing email integration: `lib/email.ts`
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma idempotency guidance: https://www.prisma.io/docs/orm/prisma-client/queries/transactions

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented event-dispatch module, route integrations, Prisma schema/migration, and tests.
- Validation commands:
- `npx prisma generate`
- `npx tsc --noEmit -p tsconfig.json`
- `npx tsx --test tests/payment/momo-callback-route.test.ts tests/payment/zalopay-callback-route.test.ts tests/orders/orders-route.test.ts tests/notifications/dispatcher.test.ts`
- `npm run lint`
- `npm test` (node tests pass; Vitest worker error in this environment is pre-existing)

### Completion Notes List

- Implemented `lib/notifications/dispatcher.ts` with durable idempotency via `NotificationDispatch`, bounded retry, fallback channel tracking, and structured dispatch logs.
- Integrated non-blocking dispatch triggers in order creation, MoMo callback, ZaloPay callback, account verification, and admin campaign publish flows.
- Added Prisma enum/model + migration for durable correlation-key replay guard and operational visibility.
- Added/updated tests covering dispatcher retry/idempotency/failure, order-route dispatch emission, and payment callback dispatch integration.
- Story acceptance criteria satisfied and story moved to `review`.

### File List

- _bmad-output/implementation-artifacts/5-1-event-driven-notification-delivery.md
- app/api/orders/route.ts
- app/api/payment/momo/callback/route.ts
- app/api/payment/zalopay/callback/route.ts
- app/api/auth/register/verify/route.ts
- app/api/admin/notifications/route.ts
- app/api/admin/notifications/[id]/route.ts
- lib/notifications/dispatcher.ts
- prisma/schema.prisma
- prisma/migrations/20260407120500_add_notification_dispatch/migration.sql
- tests/notifications/dispatcher.test.ts
- tests/orders/orders-route.test.ts
- tests/payment/momo-callback-route.test.ts
- tests/payment/zalopay-callback-route.test.ts

## Change Log

- 2026-04-07: Implemented event-driven notification delivery with retry/fallback, durable idempotency tracking, and route-level integrations across order/payment/account/campaign events.
- 2026-04-09: Code review fixes applied for callback race-safety (atomic payment transition) and notification email sanitization; regression tests added and passing for affected flows.

## Story Context Status

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to `review` after implementation, validation, and test execution.
