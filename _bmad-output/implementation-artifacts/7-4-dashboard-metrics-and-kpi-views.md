# Story 7.4: Dashboard Metrics and KPI Views

Status: review

## Story

As an admin,  
I want dashboard visibility into sales and operations,  
so that I can monitor business health.

## Acceptance Criteria

1. Given order and engagement data exists, when I open operational dashboards, then key indicators for sales are displayed with deterministic definitions.
2. Given order and engagement data exists, when I open operational dashboards, then key indicators for conversion are displayed with deterministic definitions.
3. Given order and engagement data exists, when I open operational dashboards, then key indicators for order states are displayed with deterministic definitions.
4. Given dashboard data is queried through admin surfaces, when data is fetched and refreshed, then refresh behavior is explicit and retrieval stays within agreed performance budgets.

## Tasks / Subtasks

- [x] Harden admin dashboard API contract and RBAC behavior (AC: 1, 2, 3, 4)
  - [x] Refactor `app/api/admin/dashboard/route.ts` to align with current admin route hardening pattern (`requireAdmin`, deterministic 401/403/400/500 mapping, `{ success, data?, error? }` envelope).
  - [x] Keep dependency-injection friendly handler shape for route-level unit testing (same approach used in Stories 7.1-7.3).
  - [x] Define/validate dashboard query inputs (time window, optional granularity/refresh params if introduced) with deterministic defaults and safe bounds.

- [x] Define and implement KPI computation model for sales, conversion, and order states (AC: 1, 2, 3)
  - [x] Specify metric formulas in code comments/dev notes (for example: revenue totals, order volume, conversion proxy, order-state distribution).
  - [x] Rework time-bucket aggregation logic to avoid nondeterministic grouping behavior and ensure chart buckets are stable.
  - [x] Ensure numeric serialization is consistent for API consumers (`number` values in `types/api.types.ts`).

- [x] Align dashboard API, types, service, hook, and page end-to-end (AC: 1, 2, 3, 4)
  - [x] Update `types/api.types.ts` (`DashboardStats`) to match final API shape exactly.
  - [x] Update `services/admin/dashboard.service.ts` and `hooks/admin/use-dashboard.ts` to preserve contract-safe consumption.
  - [x] Update `app/admin/dashboard/page.tsx` rendering to handle new KPI/state fields and no-data fallback paths without runtime exceptions.
  - [x] Keep existing admin visual language and component patterns; do not introduce duplicate dashboard modules.

- [x] Add explicit refresh and performance guardrails (AC: 4)
  - [x] Keep refresh policy explicit in hook/page (`refetchInterval`, `staleTime`, optional manual refresh action) and document rationale.
  - [x] Minimize query cost (bounded result sets, selective fields, grouped aggregation strategy, no unbounded scans).
  - [x] Validate dashboard read path against PRD NFR2 target (read endpoints p95 <= 400ms) with practical local measurement notes.

- [x] Add focused regression tests for dashboard correctness and contract safety (AC: 1, 2, 3, 4)
  - [x] Add `tests/admin/admin-dashboard-routes.test.ts` for authorization, malformed query handling, deterministic KPI serialization, and envelope-safe error behavior.
  - [x] Add tests for metric edge cases (empty datasets, all-cancelled periods, mixed order states, timezone/day-boundary behavior).
  - [x] Add/extend tests ensuring hook/service compatibility if response shape changes.

## Dev Notes

- Scope boundaries:
- In scope: admin dashboard KPI API + admin dashboard UI/hook/service/type synchronization, deterministic metric definitions, and performance-aware read behavior.
- Out of scope: payment/order discrepancy investigation surfaces (Story 8.1), new audit log capabilities (Story 8.2), and broad API contract harmonization across all modules (Story 8.4).

- Existing implementation baseline to extend (do not rebuild):
- Dashboard API/UI/client:
  - `app/api/admin/dashboard/route.ts`
  - `app/admin/dashboard/page.tsx`
  - `services/admin/dashboard.service.ts`
  - `hooks/admin/use-dashboard.ts`
  - `types/api.types.ts` (`DashboardStats`)
- Related admin patterns to mirror:
  - `app/api/admin/orders/route.ts`
  - `app/api/admin/membership/route.ts`
  - `app/api/admin/settings/route.ts`

- Previous story intelligence (Stories 7.1-7.3) to preserve:
- Use `requireAdmin` consistently for `/api/admin/*`; avoid mixed auth patterns.
- Keep strict boundary validation and deterministic 400/401/403/500 behavior.
- Keep backend/frontend contract updates in the same story when response shape changes.
- Add route-level regression tests with handler + dependency injection to prevent brittle integration-only coverage.

- Architecture and project guardrails:
- Preserve route -> service -> hook/page layering and standardized response envelope.
- Use Prisma as single data authority; keep query shape explicit and bounded.
- Avoid introducing parallel v2 dashboard APIs when current module can be hardened incrementally.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/dashboard/route.ts`
- `app/admin/dashboard/page.tsx`
- `services/admin/dashboard.service.ts`
- `hooks/admin/use-dashboard.ts`
- `types/api.types.ts`
- `tests/admin/*` (new focused dashboard route suite)

- Keep naming/location aligned with current admin domain conventions.

### Testing Requirements

- Verify admin authorization behavior for dashboard route (401 unauthenticated, 403 non-admin if role-aware guard is used).
- Verify dashboard response contract remains `{ success, data?, error? }`.
- Verify KPI fields are deterministic under edge datasets and timezone/day boundary conditions.
- Verify order-state indicators are computed and serialized consistently.
- Verify refresh behavior configuration is explicit and does not cause aggressive polling.
- Verify no frontend contract drift between API response and `DashboardStats` consumption.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.4)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR36, NFR2, NFR6, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (admin route layering, `app/admin/dashboard/page.tsx`, API contract consistency)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story learnings:
  - `_bmad-output/implementation-artifacts/7-1-order-lifecycle-operations.md`
  - `_bmad-output/implementation-artifacts/7-2-customer-operational-view.md`
  - `_bmad-output/implementation-artifacts/7-3-membership-and-store-settings-administration.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Refactored `app/api/admin/dashboard/route.ts` to handler-based flow with dependency injection (`handleAdminDashboardGetRequest`) and deterministic error/status mapping.
- Replaced mixed auth check with `requireAdmin` and added query validation for `windowDays` (`7|14|30`), returning explicit 400 for malformed values.
- Reworked KPI aggregation to deterministic business-timezone (`Asia/Ho_Chi_Minh`) day bucketing and pushed window aggregation to DB-level grouped queries (daily buckets + state counts).
- Updated dashboard contract end-to-end: `types/api.types.ts`, `services/admin/dashboard.service.ts`, `hooks/admin/use-dashboard.ts`, and `app/admin/dashboard/page.tsx`.
- Added focused route-level regression suite `tests/admin/admin-dashboard-routes.test.ts` covering auth failures, query validation, deterministic serialization, and empty-dataset behavior.
- Removed unused `topProducts` dashboard payload computation to avoid unnecessary groupBy/product lookup overhead.
- Added `tests/admin/admin-dashboard-service.test.ts` to verify dashboard service contract compatibility for `windowDays` query-based fetching.
- Validation runs completed: `npm run test:node -- tests/admin/admin-dashboard-routes.test.ts`, `npx tsc --noEmit -p tsconfig.json`, targeted `eslint`.
- Full `npm test` still fails in existing Vitest worker bootstrap (`ERR_REQUIRE_ASYNC_MODULE` via jsdom/css-color), unrelated to Story 7.4 changes.
- `npm run build` blocked in this environment by existing Prisma engine file lock (`EPERM rename ... query_engine-windows.dll.node`).

### Completion Notes List

- Hardened admin dashboard API to align with existing `/api/admin/*` guardrails (RBAC, validated input, contract-safe responses).
- Implemented deterministic KPI model for sales/conversion/order states with stable business-timezone chart buckets and DB-aggregated bounded window reads.
- Added explicit refresh policy through hook options (`staleTime`, `refetchInterval`, `refetchOnWindowFocus`) and window selector on dashboard page.
- Synced dashboard API contract across backend and frontend types/services/hooks/page without introducing parallel modules.
- Added regression tests for dashboard route edge cases and deterministic payload behavior, including 403, all-cancelled windows, and timezone boundary coverage.
- Verified node test suite, typecheck, and lint for touched code; documented existing unrelated Vitest and build-environment blockers.

### File List

- _bmad-output/implementation-artifacts/7-4-dashboard-metrics-and-kpi-views.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/admin/dashboard/route.ts
- app/admin/dashboard/page.tsx
- hooks/admin/use-dashboard.ts
- services/admin/dashboard.service.ts
- tests/admin/admin-dashboard-routes.test.ts
- tests/admin/admin-dashboard-service.test.ts
- types/api.types.ts

## Change Log

- 2026-04-14: Created Story 7.4 context file with implementation guardrails for dashboard metrics and KPI views.
- 2026-04-14: Implemented Story 7.4 dashboard API/UI contract hardening, deterministic KPI aggregation, and focused admin regression tests; moved story to `review`.
- 2026-04-14: Applied CR follow-up patch set for business-timezone window boundaries, DB-level aggregation, removal of unused top-products query, and additional coverage gaps (403/timezone/all-cancelled/service contract).

## Story Context Status

- Development implementation completed and ready for code review (`review`).
