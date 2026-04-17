# Story 8.1: Payment and Order Discrepancy Investigation Workspace

Status: done

## Story

As a support/admin user,  
I want to investigate payment and order mismatches,  
so that I can resolve incidents without data ambiguity.

## Acceptance Criteria

1. Given callback/order discrepancies occur, when I inspect investigation views, then I can trace callback logs, reconciliation attempts, and current order/payment states.
2. Given callback/order discrepancies occur, when I inspect investigation views, then investigation actions are permission-checked.
3. Given callback/order discrepancies occur, when I inspect investigation views, then investigation actions are auditable.

## Tasks / Subtasks

- [x] Harden discrepancy investigation API surface using existing admin guardrails (AC: 1, 2, 3)
- [x] Add or extend admin investigation endpoints under `app/api/admin/orders/**` to return a unified investigation payload (order snapshot + payment snapshot + callback event timeline + reconciliation markers) without introducing parallel v2 route groups.
- [x] Enforce `requireAdmin` and deterministic `{ success, data?, error? }` envelopes with explicit 401/403/400/500 mappings aligned to existing `/api/admin/*` routes.
- [x] Validate request params/filters at boundary (order identifier, pagination/window args if introduced) and reject malformed inputs with clear 400 responses.

- [x] Reuse and extend existing operational data sources instead of duplicating logic (AC: 1)
- [x] Build on `app/api/admin/orders/route.ts`, `app/api/admin/orders/[id]/route.ts`, and `app/api/admin/orders/[id]/audit/route.ts` as primary read surfaces.
- [x] Reuse payment callback artifacts from `app/api/payment/momo/callback/route.ts` and `app/api/payment/zalopay/callback/route.ts` event semantics (`received`, `processed`, `replay_ignored`, `conflict`, `verification_failed`, `invalid_payload`) for discrepancy diagnostics.
- [x] Define deterministic fallback behavior when callback-derived details are missing (for example, legacy orders without captured callback metadata).
- [x] Persist callback investigation signals in structured storage (not console-only runtime logs) so support/admin can query callback timeline by order/payment correlation.
- [x] If no existing persistent callback-event store is available, add a minimal schema + migration and write path from callback handlers in the same story.

- [x] Implement discrepancy-oriented admin UI workflow (AC: 1, 2)
- [x] Extend current admin order detail/operations surfaces (`app/admin/orders/[id]/page.tsx`, `hooks/admin/use-orders.ts`, `services/admin/orders.service.ts`) with an investigation panel/tab instead of a new standalone admin domain.
- [x] Surface clear, chronological diagnostics: current order status, current payment status, callback transition signals, conflict/replay indicators, and latest audit mutations.
- [x] Keep existing admin visual language and interaction patterns.

- [x] Ensure investigation actions are auditable and traceable (AC: 3)
- [x] Record investigation-specific admin actions with actor, timestamp, target entity, and correlation metadata; prefer extending existing audit model/helpers if possible before adding new schema.
- [x] If schema extension is required, update `prisma/schema.prisma` and add a matching migration in the same story.
- [x] Ensure callback-event and reconciliation-attempt records exclude secrets/sensitive payloads while preserving diagnostic fields required for incident triage.

- [x] Keep backend/frontend contract synchronized (AC: 1, 2, 3)
- [x] Update `types/api.types.ts` with investigation response types and any new request payloads.
- [x] Update `lib/api/endpoints.ts`, `services/admin/orders.service.ts`, and `hooks/admin/use-orders.ts` in the same change set.
- [x] Update consuming admin UI in the same story (no deferred contract drift).

- [x] Add focused regression tests for discrepancy investigation and contract safety (AC: 1, 2, 3)
- [x] Add/extend route-level tests under `tests/admin/*` for authorization, malformed inputs, deterministic envelope behavior, and discrepancy payload composition.
- [x] Add tests for callback mismatch edge cases (conflicting duplicate callback, replay ignored, missing callback metadata, payment/order status divergence).
- [x] Add hook/service tests when response contract changes.

## Dev Notes

- Scope boundaries:
- In scope: admin discrepancy investigation read/workflow surfaces and auditability for investigation actions.
- Out of scope: broad RBAC refactor across all modules (Story 8.3), global API contract/versioning sweep (Story 8.4), and unrelated dashboard enhancements.

- Existing implementation baseline to extend (do not rebuild):
- Admin routes/UI/client:
  - `app/api/admin/orders/route.ts`
  - `app/api/admin/orders/[id]/route.ts`
  - `app/api/admin/orders/[id]/audit/route.ts`
  - `app/admin/orders/[id]/page.tsx`
  - `services/admin/orders.service.ts`
  - `hooks/admin/use-orders.ts`
- Payment callback reliability surfaces:
  - `app/api/payment/momo/callback/route.ts`
  - `app/api/payment/zalopay/callback/route.ts`
- Existing audit utility:
  - `lib/order-audit.ts`

- Data model and architectural guardrails:
- Keep Prisma/PostgreSQL as source of truth (`Order`, `Payment`, `OrderAuditLog`).
- Callback handler console logs are not sufficient for investigation UX; Story 8.1 implementation must produce queryable structured callback-event records.
- Preserve route -> service -> hook/page layering and standardized API envelope.
- Keep RBAC explicit at API boundary (`requireAdmin`) and do not rely on client-only guards.
- Prefer extending existing audit and order modules over introducing separate discrepancy subsystem files unless justified by clear cohesion boundaries.

- Previous story intelligence to preserve (Epic 7 pattern continuity):
- Continue deterministic status/error mapping and strict boundary input validation.
- Maintain backend/frontend synchronization within the same story when any API contract shifts.
- Keep dependency-injection-friendly route handler shape where practical for testability.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[id]/route.ts`
- `app/api/admin/orders/[id]/audit/route.ts`
- `app/admin/orders/[id]/page.tsx`
- `services/admin/orders.service.ts`
- `hooks/admin/use-orders.ts`
- `types/api.types.ts`
- `lib/api/endpoints.ts`
- `lib/order-audit.ts`
- `tests/admin/*` and `tests/payment/*` (targeted additions only)

- Keep naming/location aligned with current admin/orders conventions.

### Testing Requirements

- Verify investigation endpoints enforce admin authorization (401 unauthenticated, 403 non-admin).
- Verify malformed investigation query/path inputs return deterministic 400 errors.
- Verify investigation payload shape is stable and contract-safe (`{ success, data?, error? }`).
- Verify discrepancy diagnostics correctly represent conflict/replay/processed callback scenarios.
- Verify investigation actions emit auditable records with actor + timestamp + correlation metadata.
- Verify UI/service/hook consumers remain in sync with final API types.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 8, Story 8.1)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR37, FR39, FR40, NFR6, NFR8, NFR9, NFR21, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (RBAC at boundaries, API envelope consistency, layered module pattern, support/governance FR37-FR40 mapping)
- Project sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story learnings:
  - `_bmad-output/implementation-artifacts/7-3-membership-and-store-settings-administration.md`
  - `_bmad-output/implementation-artifacts/7-4-dashboard-metrics-and-kpi-views.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created Story 8.1 context from Epic 8 acceptance criteria and existing admin/payment/audit implementation baseline.
- Identified primary reuse points to prevent reinvention: admin order detail + audit routes, payment callback transition logs, and existing order audit helper.
- Captured contract and RBAC guardrails from completed Epic 7 stories as mandatory continuity requirements.
- Added structured callback-audit persistence (`PAYMENT_CALLBACK`) in callback handlers and safe metadata sanitization in `lib/order-audit.ts`.
- Added new admin investigation endpoint `GET /api/admin/orders/[id]/investigation` with deterministic auth/error mapping and DI-friendly handler export for route-level tests.
- Added contract wiring for investigation payload across `types/api.types.ts`, `lib/api/endpoints.ts`, `services/admin/orders.service.ts`, and `hooks/admin/use-orders.ts`.
- Extended admin order detail UI to show discrepancy investigation context (current state, callback timeline, reconciliation attempts).
- Added focused regression suite `tests/admin/admin-order-investigation-routes.test.ts` and re-ran payment callback route tests.
- Applied CR follow-up: callback handlers now persist failure-path events (`verification_failed`, `invalid_payload`) into callback audit records for investigation timeline completeness.
- Applied CR follow-up: investigation route now validates malformed order id and returns deterministic 400.
- Applied CR follow-up: restored strict audit integrity behavior by no longer suppressing `P2003` in generic order-audit writers.

### Completion Notes List

- Implemented Story 8.1 investigation workspace by extending existing admin order domain (no duplicate subsystem).
- Persisted callback diagnostics as structured `OrderAuditLog` entries (`mutationType: PAYMENT_CALLBACK`) with sensitive field sanitization.
- Delivered admin investigation API returning order/payment states, callback timeline, reconciliation attempts, and audit trail.
- Synced API contract changes end-to-end (types, endpoints, service, hook, and admin order UI).
- Added route-level regression tests for investigation endpoint and verified callback mismatch/replay/conflict behavior through callback route tests.
- Added regression coverage for malformed investigation identifiers and callback failure-event audit persistence.
- Added audit writer regression tests ensuring foreign-key integrity errors are surfaced (not swallowed) for status-update audit paths.
- Validation run summary:
- `npx tsc --noEmit -p tsconfig.json` (pass)
- `npx tsx --test tests/admin/admin-order-investigation-routes.test.ts tests/orders/order-audit-writer.test.ts tests/payment/momo-callback-route.test.ts tests/payment/zalopay-callback-route.test.ts` (pass)
- `npm run lint` (pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)
- `npm test` (node tests pass; pre-existing Vitest worker issue `ERR_REQUIRE_ASYNC_MODULE` remains)

### File List

- _bmad-output/implementation-artifacts/8-1-payment-and-order-discrepancy-investigation-workspace.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/story-validation-report-8-1-payment-and-order-discrepancy-investigation-workspace-2026-04-17.md
- app/api/admin/orders/[id]/investigation/route.ts
- app/api/payment/momo/callback/route.ts
- app/api/payment/zalopay/callback/route.ts
- app/admin/orders/[id]/page.tsx
- lib/order-audit.ts
- lib/api/endpoints.ts
- services/admin/orders.service.ts
- hooks/admin/use-orders.ts
- types/api.types.ts
- tests/admin/admin-order-investigation-routes.test.ts
- tests/orders/order-audit-writer.test.ts

## Change Log

- 2026-04-17: Created Story 8.1 context file with implementation guardrails for payment/order discrepancy investigation workspace.
- 2026-04-17: Completed Story 8.1 implementation (investigation endpoint, callback audit persistence, admin UI integration, and regression tests); moved status to `review`.
- 2026-04-17: Applied CR follow-up fixes for callback failure-event persistence, malformed investigation ID validation, and audit integrity safeguards.

## Story Context Status

- Implementation completed and ready for code review (`review`).
