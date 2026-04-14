# Story 7.3: Membership and Store Settings Administration

Status: done

## Story

As an admin,  
I want to configure membership and store settings,  
so that business rules can evolve without code deployment.

## Acceptance Criteria

1. Given settings modules are enabled, when I update membership thresholds or store-level parameters, then updates are validated, versioned, and applied to eligible flows.
2. Given invalid configurations are submitted, when validation executes at API boundaries, then requests are blocked with clear error guidance and contract-safe responses.
3. Given admin settings APIs are consumed by existing admin services/hooks/pages, when responses are returned, then contracts remain backward-compatible (`{ success, data?, error? }`) or are updated end-to-end in the same story.
4. Given requests reach `/api/admin/membership` and `/api/admin/settings`, when authorization fails or payloads are malformed, then RBAC/validation failures are mapped deterministically to 401/403/400 without leaking internals.

## Tasks / Subtasks

- [x] Harden admin membership and settings route handlers with explicit RBAC + boundary validation (AC: 1, 2, 4)
- [x] Replace `getSession` role checks in `app/api/admin/membership/route.ts` and `app/api/admin/settings/route.ts` with consistent `requireAdmin`/dependency-injected guard pattern already used across `/api/admin/*`.
- [x] Add strict input schemas for PUT payloads (membership level shape/order/threshold monotonicity, discount bounds, numeric non-negative constraints, store settings key allowlist, and type-safe conversion for JSON-like fields such as pickup slots).
- [x] Return explicit 400 guidance for malformed JSON/unknown keys/invalid value ranges; preserve safe 500 mapping for unexpected failures.

- [x] Resolve settings contract drift across API, types, services, hooks, and admin pages (AC: 1, 3)
- [x] Reconcile key mismatch between route defaults/valid keys and UI payload keys (`min_order_amount` + `free_delivery_threshold` vs `min_order_delivery`), then standardize one contract.
- [x] Align `types/api.types.ts` (`StoreSettings`, request types, `MembershipConfig`) with route responses and UI expectations.
- [x] Update `services/admin/settings.service.ts`, `services/admin/membership.service.ts`, `hooks/admin/use-settings.ts`, `hooks/admin/use-membership.ts`, and `app/admin/settings/page.tsx` + `app/admin/membership/page.tsx` to match normalized contracts.

- [x] Ensure membership/store updates apply to downstream eligible flows without regressions (AC: 1, 3)
- [x] Verify `lib/membership/rules.ts` readers and consumers (`app/api/orders/route.ts`, `app/api/incentives/preview/route.ts`, `app/api/membership/benefits/route.ts`) continue to read updated configuration correctly.
- [x] Keep defaults deterministic when settings rows are absent and prevent invalid persisted values from causing runtime inconsistencies.

- [x] Add versioning/auditability for configuration mutations (AC: 1)
- [x] Reuse existing admin audit patterns (`lib/order-audit.ts`, `lib/product-audit.ts`) or add a focused settings-audit helper for membership/store changes (actor, key/group, before/after snapshot, timestamp, correlation metadata).
- [x] Ensure behavior is non-silent on audit failure according to existing project policy; if graceful degradation is required, document and test the expected mode.

- [x] Add focused regression tests for admin membership/settings APIs and contract compatibility (AC: 1..4)
- [x] Add `tests/admin/admin-membership-settings-routes.test.ts` covering authorization, malformed JSON, invalid payloads, successful updates, and contract-safe envelopes.
- [x] Add coverage for key normalization and contract alignment (including pickup slot parsing/serialization and delivery threshold fields).
- [x] Extend or add tests around membership rule consumption where necessary (`tests/orders/membership-rules.test.ts`, order/incentive route tests) to prove updates propagate safely.

## Dev Notes

- Scope boundaries:
- In scope: membership/store settings admin API and admin UI/service/hook contract hardening, config validation, and configuration mutation audit/versioning.
- Out of scope: customer operational data views (Story 7.2) and dashboard KPI aggregation (Story 7.4).

- Existing implementation baseline to extend (do not rebuild):
- Admin APIs:
  - `app/api/admin/membership/route.ts`
  - `app/api/admin/settings/route.ts`
- Admin client layer:
  - `services/admin/membership.service.ts`
  - `services/admin/settings.service.ts`
  - `hooks/admin/use-membership.ts`
  - `hooks/admin/use-settings.ts`
- Admin UI:
  - `app/admin/membership/page.tsx`
  - `app/admin/settings/page.tsx`
- Domain readers impacted by membership config:
  - `lib/membership/rules.ts`
  - `app/api/orders/route.ts`
  - `app/api/incentives/preview/route.ts`
  - `app/api/membership/benefits/route.ts`
- Shared contracts:
  - `types/api.types.ts`
  - `lib/api/endpoints.ts`
- Data model:
  - `prisma/schema.prisma` (`Setting` model)

- Previous story intelligence (Stories 7.1, 7.2) to preserve:
- Keep authorization consistent across `/api/admin/*` via `requireAdmin`.
- Preserve standardized envelope shape and deterministic 401/403/400/500 mapping.
- Validate request payloads explicitly at route boundaries; reject unknown/malformed shapes.
- Keep backend/frontend changes synchronized in the same story (types + services + hooks + pages + tests).

- Architecture and project guardrails:
- Preserve route -> service -> domain utility -> Prisma layering.
- Keep API contract stable: `{ success, data?, error? }`.
- Keep Prisma `Setting` as source of truth for configurable values; avoid hard-coding behavior outside sanctioned defaults.
- Prefer extending existing membership/settings modules over introducing parallel v2 paths.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/membership/route.ts`
- `app/api/admin/settings/route.ts`
- `app/admin/membership/page.tsx`
- `app/admin/settings/page.tsx`
- `services/admin/membership.service.ts`
- `services/admin/settings.service.ts`
- `hooks/admin/use-membership.ts`
- `hooks/admin/use-settings.ts`
- `types/api.types.ts`
- `lib/membership/rules.ts`
- `tests/admin/*`
- `tests/orders/*` (targeted additions only)

- Keep naming/location aligned with existing admin and settings domain conventions.

### Testing Requirements

- Verify `/api/admin/membership` and `/api/admin/settings` enforce RBAC and reject unauthorized requests.
- Verify malformed JSON, unknown keys, invalid types/ranges, and invalid membership tier configurations return clear 400-class errors.
- Verify successful updates persist through `Setting` rows and are reflected in subsequent GET responses.
- Verify contract consistency across route responses, `types/api.types.ts`, services, hooks, and admin pages.
- Verify membership configuration changes are consumed correctly in downstream order/incentive/benefit computations.
- Verify audit/versioning behavior for privileged config mutations (including failure-path behavior).

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.3)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR35, FR39, FR40, NFR6, NFR8, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (admin boundaries, RBAC, API envelope consistency, layered modules)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story learnings:
  - `_bmad-output/implementation-artifacts/7-1-order-lifecycle-operations.md`
  - `_bmad-output/implementation-artifacts/7-2-customer-operational-view.md`
- Existing modules:
  - `app/api/admin/membership/route.ts`
  - `app/api/admin/settings/route.ts`
  - `lib/membership/rules.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created Story 7.3 context file from Epic 7 requirements and current admin membership/settings implementation baseline.
- Identified contract drift risk between settings route keys, UI payload keys, and API type definitions; added explicit reconciliation tasks.
- Captured prior Epic 7 hardening patterns (RBAC consistency, deterministic validation/error mapping, contract-safe envelopes) as mandatory guardrails.
- Refactored `app/api/admin/membership/route.ts` into handler-based flow with strict payload validation, deterministic 400 errors, and transactional setting updates.
- Refactored `app/api/admin/settings/route.ts` into handler-based flow with strict allowlist validation, legacy-key normalization, typed settings serialization, and deterministic 400 errors.
- Added `SettingAuditLog` schema + migration and `lib/setting-audit.ts` to write configuration change audits transactionally for membership/settings mutations.
- Synced admin contracts end-to-end (`types/api.types.ts`, admin services, and admin pages) to canonical settings keys and typed values (`pickup_slots[]`, booleans, numeric thresholds).
- Added targeted regression tests in `tests/admin/admin-membership-settings-routes.test.ts` covering malformed JSON, invalid payloads, key normalization, and update propagation paths.
- Ran validations: `npx prisma generate`, `npx tsc --noEmit -p tsconfig.json`, targeted `eslint`, and `npm run test:node` (pass).
- Full `npm test` failed in existing Vitest environment due jsdom/ESM worker issue (`ERR_REQUIRE_ASYNC_MODULE` from `@asamuzakjp/css-color`).
- `npm run build` reached Next.js prerender and failed on existing unrelated `/ingredients` Suspense boundary issue (`useSearchParams() should be wrapped in a suspense boundary`).

### Completion Notes List

- Hardened admin membership/settings APIs with explicit RBAC enforcement, strict payload validation, and deterministic contract-safe error mapping.
- Implemented canonical store settings contract with legacy key compatibility mapping and typed serialization/deserialization for pickup slots, booleans, and numeric thresholds.
- Added transactional audit/versioning for configuration mutations via new `SettingAuditLog`.
- Updated admin UI and service/type contracts to stay synchronized with normalized backend response shapes.
- Added focused admin regression coverage for Story 7.3 API behavior and compatibility scenarios.
- Validation completed for TypeScript, lint, and node test suite; documented existing external blockers in Vitest and prerender build.
- Resolved CR high findings: deterministic canonical-over-legacy settings precedence, membership response mapping by explicit level key, and range-aware pickup slot validation.
- Added CR regression tests for precedence conflict, out-of-order membership tier mapping, and impossible pickup slot values.

### File List

- _bmad-output/implementation-artifacts/7-3-membership-and-store-settings-administration.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/admin/membership/route.ts
- app/api/admin/settings/route.ts
- app/admin/settings/page.tsx
- app/admin/membership/page.tsx
- lib/membership/rules.ts
- lib/setting-audit.ts
- services/admin/membership.service.ts
- types/api.types.ts
- tests/admin/admin-membership-settings-routes.test.ts
- prisma/schema.prisma
- prisma/migrations/20260414084500_story_7_3_setting_audit_log/migration.sql
- prisma/seed.ts

## Change Log

- 2026-04-14: Created Story 7.3 context file with implementation guardrails for membership and store settings administration.
- 2026-04-14: Implemented Story 7.3 membership/store settings hardening, contract sync, setting audit logging, and regression tests; moved story to `review`.
- 2026-04-14: Applied CR patch set for deterministic settings resolution, level-safe membership mapping, and stricter pickup slot time validation.

## Story Context Status

- Development implementation and review follow-ups completed (`done`).
