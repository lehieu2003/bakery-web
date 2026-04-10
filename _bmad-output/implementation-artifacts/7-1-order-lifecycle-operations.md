# Story 7.1: Order Lifecycle Operations

Status: done

## Story

As an admin operator,  
I want to view and update order statuses,  
so that fulfillment and customer communication remain synchronized.

## Acceptance Criteria

1. Given orders exist across lifecycle states, when I transition an order status, then transitions follow allowed state machine rules.
2. Given orders exist across lifecycle states, when I transition an order status, then each status change is audit-logged and reflected in customer-facing order history.
3. Given admin order mutations are executed, when operations succeed or fail, then API responses preserve standardized contract (`{ success, data?, error? }`) and remain backward-compatible with current services/hooks.
4. Given order lifecycle routes are privileged operations, when requests reach `/api/admin/orders*`, then RBAC is enforced consistently with explicit validation and safe error mapping.

## Tasks / Subtasks

- [x] Harden admin order list/detail/status-update routes with explicit state-machine validation (AC: 1, 3, 4)
- [x] Keep `/api/admin/orders` and `/api/admin/orders/[id]` under consistent admin authorization and envelope-safe responses.
- [x] Validate list query parameters (`page`, `limit`, `status`, `search`) with deterministic normalization and safe bounds.
- [x] Enforce allowed status transitions (not just allowed enum values) for order lifecycle updates.
- [x] Keep status update behavior deterministic for side effects already tied to status change (e.g., incentive/coupon lifecycle hooks).

- [x] Add audit visibility for order status transitions (AC: 2, 3, 4)
- [x] Ensure each status change emits a durable audit event with actor, order reference, old/new status, and timestamp.
- [x] Keep audit recording resilient and non-silent on failure paths (no false success when audit write fails).
- [x] Expose required audit context for admin/support retrieval without leaking restricted payload fields.

- [x] Preserve customer-facing consistency after admin transitions (AC: 1, 2, 3)
- [x] Verify admin status updates are reflected in order history/read models consumed by customer endpoints.
- [x] Keep backward compatibility with order services/hooks and admin UI pages (`services/admin/orders.service.ts`, `hooks/admin/use-orders.ts`, `app/admin/orders/*`).
- [x] Reconcile admin status-update endpoint compatibility (`services/admin/orders.service.ts` currently targets `/api/admin/orders/[id]/status` while route handlers are `/api/admin/orders/[id]`).

- [x] Add regression tests for lifecycle transitions and audit behavior (AC: 1..4)
- [x] Add admin route tests for authorization, invalid transition blocking, and contract-safe error handling.
- [x] Add tests for audit event creation on status change and no-op update behavior.
- [x] Extend existing order test suites under `tests/orders/*` and add focused admin suite (e.g., `tests/admin/admin-orders-routes.test.ts`) without duplicating prior coverage.

### Review Findings

- [x] [Review][Patch] Malformed JSON on admin order PATCH currently returns 500 instead of 400 [app/api/admin/orders/[id]/route.ts:295]
- [x] [Review][Patch] `/api/admin/orders/[id]/status` delegates full patch handler and allows non-status field mutation via status-only endpoint [app/api/admin/orders/[id]/status/route.ts:32]

## Dev Notes

- Scope boundaries:
- In scope: admin order lifecycle status operations, transition guards, audit capture for status mutations, and contract stability.
- Out of scope: broader customer operations views (Story 7.2), membership/settings management (Story 7.3), and dashboard KPI aggregation (Story 7.4).

- Existing implementation baseline to extend (do not rebuild):
- Admin APIs:
  - `app/api/admin/orders/route.ts`
  - `app/api/admin/orders/[id]/route.ts`
- Related domain logic:
  - `lib/incentives/redemption-lifecycle.ts`
- Admin client layer:
  - `services/admin/orders.service.ts`
  - `hooks/admin/use-orders.ts`
- Admin UI:
  - `app/admin/orders/page.tsx`
  - `app/admin/orders/[id]/page.tsx`
- Customer/order surfaces likely impacted by status changes:
  - `app/api/orders/route.ts`
  - `services/orders.service.ts`
  - `hooks/use-orders.ts`
- Data model:
  - `prisma/schema.prisma` (`Order`, `OrderStatus`, payment/order item relations, audit-related models if present)

- Previous story intelligence (Epic 6) to preserve:
- Keep strict request validation at route boundaries; avoid permissive coercion.
- Keep safe 500 error mapping in admin APIs and preserve 401/403 specificity.
- Use transactional updates for multi-write status side effects.
- Keep response contracts stable for existing admin/customer hooks.

- Architecture and project guardrails:
- Preserve route -> service -> domain utility -> Prisma layering.
- Preserve standardized API envelope: `{ success, data?, error? }`.
- Enforce RBAC on every `/api/admin/*` operation and avoid `getSession`/`requireAdmin` inconsistency across sibling routes.
- Follow backend-frontend sync rule: if route response shape changes, update services/hooks/call sites in same story.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[id]/route.ts`
- `lib/incentives/redemption-lifecycle.ts`
- `services/admin/orders.service.ts`
- `hooks/admin/use-orders.ts`
- `app/admin/orders/page.tsx`
- `app/admin/orders/[id]/page.tsx`
- `tests/admin/*`
- `tests/orders/*`

- Keep naming/location aligned with existing admin and order domain patterns.

### Testing Requirements

- Verify admin authorization and contract-safe error handling on all `/api/admin/orders*` handlers.
- Verify status transition matrix enforcement (valid forward transitions, blocked invalid transitions, deterministic no-op behavior).
- Verify audit event creation for status changes with required metadata (actor, old/new status, timestamp).
- Verify incentive/coupon lifecycle hooks remain correct under admin status updates.
- Verify customer-visible order status paths reflect admin transitions without contract regressions.
- Verify `ordersService.update` and `ordersService.updateStatus` both resolve to valid backend handlers after lifecycle hardening (no broken admin status action path).

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.1)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR33, FR38, FR39, FR40, NFR6, NFR8, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (Admin ops mapping, RBAC boundary, API envelope consistency)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous epic learnings: `_bmad-output/implementation-artifacts/epic-6-retro-2026-04-10.md`
- Existing order test references: `tests/orders/*`
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma transactions docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created Story 7.1 context file from Epic 7 requirements, architecture constraints, and Epic 6 retrospective learnings.
- Validation note: captured pre-existing admin endpoint mismatch risk (`/api/admin/orders/[id]/status` vs current route surface) and added explicit compatibility task.
- Implemented hardened admin order handlers with explicit transition matrix enforcement, deterministic query normalization, and safe 401/403/500 mapping.
- Added transactional order status side-effect handling with coupon redemption lifecycle hook and durable order audit write.
- Added compatibility route for `/api/admin/orders/[id]/status` and dedicated order audit retrieval route.
- Added focused admin order route tests and ran verification commands: `npx prisma generate`, `npx tsx --test tests/admin/admin-orders-routes.test.ts`, `npx tsc --noEmit -p tsconfig.json`, targeted `eslint`.

### Completion Notes List

- Hardened `/api/admin/orders` and `/api/admin/orders/[id]` with strict input validation, allowed transition enforcement, and standardized response envelopes.
- Added durable order status audit trail persistence (`OrderAuditLog`) with actor, before/after payload, metadata, and retrieval endpoint for admin/support.
- Preserved backward compatibility by implementing `/api/admin/orders/[id]/status` route used by `ordersService.updateStatus`.
- Added regression coverage for invalid status filters, invalid transitions, valid transitions, no-op updates, status endpoint delegation, and audit pagination normalization.
- Validation suite completed with passing test, typecheck, and lint results.

### File List

- _bmad-output/implementation-artifacts/7-1-order-lifecycle-operations.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/story-validation-report-7-1-order-lifecycle-operations-2026-04-10.md
- app/api/admin/orders/route.ts
- app/api/admin/orders/[id]/route.ts
- app/api/admin/orders/[id]/status/route.ts
- app/api/admin/orders/[id]/audit/route.ts
- lib/order-audit.ts
- lib/api/endpoints.ts
- prisma/schema.prisma
- prisma/migrations/20260410162500_story_7_1_order_audit_log/migration.sql
- tests/admin/admin-orders-routes.test.ts

## Change Log

- 2026-04-10: Created Story 7.1 context file with implementation guardrails for admin order lifecycle operations.
- 2026-04-10: Validated Story 7.1 context; added endpoint-compatibility guardrail for admin order status update path.
- 2026-04-10: Implemented admin order lifecycle hardening, order audit logging/retrieval, status endpoint compatibility route, and regression tests; moved story to `review`.
- 2026-04-10: Code review patch findings fixed (invalid JSON handling and status-only endpoint payload scoping); story moved to `done`.

## Story Context Status

- Development implementation completed with validation artifacts.
- Story implementation and code-review patch findings are complete (`done`).
