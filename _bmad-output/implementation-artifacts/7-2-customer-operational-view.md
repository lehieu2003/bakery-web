# Story 7.2: Customer Operational View

Status: done

## Story

As a support/admin user,  
I want to access customer operational data,  
so that I can resolve service issues quickly.

## Acceptance Criteria

1. Given I have appropriate RBAC permissions, when I open customer detail views, then I can see relevant profile, order, payment, and notification context.
2. Given customer operational data is exposed in admin APIs, when responses are returned, then sensitive fields are restricted by least-privilege rules and never leak protected credentials/session data.
3. Given admin customer operations succeed or fail, when API handlers respond, then responses preserve standardized contract (`{ success, data?, error? }`) and remain backward-compatible with current services/hooks/pages.
4. Given requests reach `/api/admin/customers*`, when authorization or input validation fails, then RBAC and validation are enforced consistently with explicit 401/403/400 handling and safe internal error mapping.

## Tasks / Subtasks

- [x] Harden admin customer list/detail/update routes with explicit RBAC and validation guardrails (AC: 1, 3, 4)
- [x] Keep `/api/admin/customers` and `/api/admin/customers/[id]` under consistent `requireAdmin` authorization and envelope-safe error mapping.
- [x] Validate list query parameters (`page`, `limit`, `search`, `level`) with deterministic normalization and bounded pagination.
- [x] Validate customer update payload types (`name`, `phone`, `memberLevel`, `points`, `isActive`) and reject malformed body shapes.
- [x] Keep route-level behavior deterministic for malformed JSON and invalid enum values (`memberLevel`).

- [x] Expand customer operational detail context for support workflows (AC: 1, 2, 3)
- [x] Include relevant order context (recent orders, statuses, totals, timestamps) needed by support/admin without over-fetching unrelated fields.
- [x] Include relevant payment context for recent order investigations (method/provider/status/transaction correlation where available).
- [x] Include relevant notification context (recent notification/read-state signals) required for service troubleshooting.
- [x] Enforce least-privilege response shape (no password/session/token/OTP artifacts in admin customer surfaces).

- [x] Preserve frontend compatibility for existing customer admin service/hook/UI consumers (AC: 1, 3)
- [x] Keep compatibility with `services/admin/customers.service.ts`, `hooks/admin/use-customers.ts`, and `app/admin/customers/page.tsx` response expectations.
- [x] If detail shape is expanded, update service/hook/UI call sites in the same story to avoid contract drift.
- [x] Reconcile detail/list type contracts in `types/api.types.ts` (including operational context fields) so `customersService.getById` and UI consumers remain type-safe.
- [x] Keep query invalidation deterministic for customer mutations.

- [x] Add regression tests for customer operational APIs (AC: 1..4)
- [x] Add admin route tests for authorization, validation failures, and contract-safe error handling.
- [x] Add tests that verify least-privilege output (sensitive fields excluded) and operational context presence.
- [x] Add tests for pagination/filter normalization and malformed payload behavior.
- [x] Create focused suite under `tests/admin/*` (e.g., `tests/admin/admin-customers-routes.test.ts`) without duplicating existing coverage.

### Review Findings

- [x] [Review][Patch] Admin customer PATCH accepts unknown payload keys instead of rejecting malformed body shapes [app/api/admin/customers/[id]/route.ts:284]

## Dev Notes

- Scope boundaries:
- In scope: admin customer list/detail/update route hardening and operational context exposure required for support workflows.
- Out of scope: order lifecycle mutation rules (Story 7.1), membership/store settings admin (Story 7.3), and dashboard KPI aggregation (Story 7.4).

- Existing implementation baseline to extend (do not rebuild):
- Admin APIs:
  - `app/api/admin/customers/route.ts`
  - `app/api/admin/customers/[id]/route.ts`
- Admin client layer:
  - `services/admin/customers.service.ts`
  - `hooks/admin/use-customers.ts`
- Admin UI:
  - `app/admin/customers/page.tsx`
- Related operational context sources:
  - `app/api/admin/orders/*`
  - `app/api/admin/notifications/*`
  - `app/api/payment/*`
- Data model:
  - `prisma/schema.prisma` (`User`, `Order`, `Payment`, `Notification*`, `MemberLevel`)

- Previous story intelligence (Story 7.1) to preserve:
- Use `requireAdmin` consistently for `/api/admin/*`; avoid mixed `getSession`/`requireAdmin` handling across sibling routes.
- Keep deterministic query normalization and bounded pagination.
- Keep safe 500 mapping (`Internal server error`) while preserving specific 401/403/400 behavior.
- Prefer handler + dependency-injection structure for targeted route tests.
- Preserve endpoint-service contract compatibility in the same story (no frontend/backend drift).

- Architecture and project guardrails:
- Preserve route -> service -> domain utility -> Prisma layering.
- Preserve standardized API envelope: `{ success, data?, error? }`.
- Enforce RBAC and least-privilege exposure on every `/api/admin/customers*` operation.
- Follow backend-frontend sync rule from project context when changing response shapes.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/customers/route.ts`
- `app/api/admin/customers/[id]/route.ts`
- `services/admin/customers.service.ts`
- `hooks/admin/use-customers.ts`
- `app/admin/customers/page.tsx`
- `types/api.types.ts`
- `tests/admin/*`

- Keep naming/location aligned with existing admin domain conventions.

### Testing Requirements

- Verify admin authorization and contract-safe error handling on all `/api/admin/customers*` handlers.
- Verify validation of pagination/filter/update payloads and malformed JSON behavior.
- Verify least-privilege constraints in list/detail payloads (no sensitive auth/session fields).
- Verify customer detail includes operational context needed for support (orders/payment/notification signals) while remaining bounded and deterministic.
- Verify service/hook/UI compatibility for customer admin flow after route hardening.
- Verify enriched customer detail contract remains aligned across route responses, `types/api.types.ts`, and `customersService.getById`.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.2)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR34, FR39, FR40, NFR6, NFR7, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (Admin boundaries, RBAC, least-privilege API constraints, envelope consistency)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story learnings: `_bmad-output/implementation-artifacts/7-1-order-lifecycle-operations.md`
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma filtering/sorting docs: https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created Story 7.2 context file from Epic 7 requirements and current admin-customer implementation baseline.
- Captured Story 7.1 hardening learnings as guardrails for RBAC consistency, error mapping, and API contract safety.
- Mapped required touch points across admin customer API/service/hook/UI layers to avoid backend-frontend contract drift.
- Validation note: captured type-contract drift risk for enriched customer detail payloads and added explicit `types/api.types.ts` reconciliation guardrail.
- Hardened `/api/admin/customers` and `/api/admin/customers/[id]` with explicit `requireAdmin`, deterministic validation, bounded pagination, and safe 401/403/400/500 mapping.
- Added customer operational detail context (recent orders, payments, notification-read signals, unread published summary) with explicit least-privilege response shaping.
- Updated customer admin UI panel to fetch and render operational context from detail API via `useCustomer`.
- Added focused admin route regression tests and ran verification commands:
  - `npx tsx --test tests/admin/admin-customers-routes.test.ts`
  - `npx tsc --noEmit -p tsconfig.json`
  - `npx eslint app/api/admin/customers/route.ts \"app/api/admin/customers/[id]/route.ts\" app/admin/customers/page.tsx tests/admin/admin-customers-routes.test.ts types/api.types.ts`

### Completion Notes List

- Implemented hardened admin customer list/detail/update routes with explicit validation and contract-safe error handling.
- Implemented least-privilege operational context payload for support/admin customer detail workflows.
- Preserved compatibility by aligning enriched detail contract across routes, `types/api.types.ts`, service/hook usage, and admin customer UI.
- Added `tests/admin/admin-customers-routes.test.ts` covering filter validation, pagination normalization, malformed JSON, enum validation, no-op patch behavior, and sensitive-field exclusion checks.
- Validation suite completed with passing test, typecheck, and lint results.

### File List

- _bmad-output/implementation-artifacts/7-2-customer-operational-view.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/story-validation-report-7-2-customer-operational-view-2026-04-10.md
- app/api/admin/customers/route.ts
- app/api/admin/customers/[id]/route.ts
- app/admin/customers/page.tsx
- tests/admin/admin-customers-routes.test.ts
- types/api.types.ts

## Change Log

- 2026-04-10: Created Story 7.2 context file with implementation guardrails for admin customer operational view and contract-safe API hardening.
- 2026-04-10: Validated Story 7.2 context; added explicit type-contract guardrail for enriched customer operational detail responses.
- 2026-04-10: Implemented Story 7.2 customer operational API/UI hardening and regression tests; moved story to `review`.
- 2026-04-10: Applied CR patch to reject unknown admin customer PATCH fields; story moved to `done`.

## Story Context Status

- Development implementation completed with validation artifacts.
- Story implementation and code-review patch findings are complete (`done`).
