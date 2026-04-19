# Story 8.4: API Contract Consistency and Version Safety

Status: review

## Story

As a frontend and integration consumer,  
I want stable API contracts,  
so that client behavior remains predictable across releases.

## Acceptance Criteria

1. Given API endpoints for customer/admin flows, when responses are returned for success and error cases, then payloads follow the `success/data/error` contract with version-safe schema evolution.
2. Given planned MVP and post-MVP changes, when API contracts evolve, then compatibility checks exist and prevent silent breaking changes.

## Tasks / Subtasks

- [x] Define and enforce a single API envelope contract at route boundaries (AC: 1)
- [x] Inventory route handlers under `app/api/**` and classify current response shape behavior (aligned, partial, non-aligned).
- [x] Introduce or consolidate reusable response helpers in `lib/` (for example `lib/api-response.ts`) to standardize success/error payloads and status mapping without changing route business logic.
- [x] Normalize error responses to deterministic `{ success: false, error: string }` and success responses to `{ success: true, data: ... }`.
- [x] Preserve existing status semantics (`400`, `401`, `403`, `404`, `409`, `422`, `500`) while unifying response body shape.

- [x] Add version-safe response typing and shared contracts for API consumers (AC: 1, 2)
- [x] Define shared envelope generics and endpoint-facing payload contracts in `types/api.types.ts` (or a dedicated companion type module) and align with `lib/api/client.ts` `ApiResponse<T>`.
- [x] Ensure additive-only schema evolution policy for MVP/post-MVP compatibility:
- [x] New fields are optional or backward-safe.
- [x] Existing required fields and keys are not removed/renamed in the same release line.
- [x] Error contract remains stable for client fallback handling.
- [x] Update admin/customer services and hooks that depend on endpoint payload shape so type contracts stay synchronized.

- [x] Add explicit contract compatibility checks in tests (AC: 2)
- [x] Add/extend route-level tests for representative endpoint classes:
- [x] Admin route (`tests/admin/*`)
- [x] Customer protected route (`tests/orders/*` or `tests/notifications/*`)
- [x] Public route (`tests/products/*` or `tests/content/*`)
- [x] Payment/integration callback route (`tests/payment/*`)
- [x] Assert both success and failure payloads conform to `success/data/error`.
- [x] Add at least one compatibility guard test per critical route family ensuring previously consumed fields remain present.

- [x] Keep backend/frontend contract synchronization in the same story (AC: 1, 2)
- [x] Update `lib/api/endpoints.ts`, `services/**`, `hooks/**`, and impacted UI consumers where payload shapes become explicit or stricter.
- [x] If no UI/service behavior changes are needed for a route family, document that explicitly in completion notes.

## Dev Notes

- Scope boundaries:
- In scope: contract consistency and version-safety guardrails across existing API surface.
- Out of scope: new major API version rollout, protocol migration (REST -> GraphQL), or broad RBAC/auth redesign (covered by Story 8.3).

- Reuse-first inventory (do not duplicate):
- Existing shared client envelope contract already exists in `lib/api/client.ts` (`ApiResponse<T>`).
- Existing endpoint registry exists in `lib/api/endpoints.ts`.
- Existing shared API/domain types exist in `types/api.types.ts`.
- Existing route-level patterns already return `success/data/error` in many handlers; extend/standardize instead of creating parallel route trees.

- Architecture guardrails to preserve:
- Keep route handler -> service -> domain utility -> Prisma layering.
- Keep deterministic auth/status mapping at route boundaries.
- Do not expose raw framework/internal errors to clients.
- Preserve timestamp serialization and pagination shape conventions where applicable.

- Candidate hotspots for normalization:
- Mixed response typing and ad-hoc JSON shaping in `app/api/orders/route.ts`, `app/api/orders/reorder/route.ts`, `app/api/incentives/*`, `app/api/payment/*/callback/route.ts`, and selected admin/content routes.
- Align any inconsistent localized error messages only if needed for contract stability; avoid broad copy changes outside contract scope.

- Previous story intelligence to preserve:
- Story 8.2 established deterministic audit route envelopes and allowlist projection.
- Story 8.3 established centralized RBAC boundaries and deny-path safety; do not regress `401/403` behaviors while standardizing envelopes.
- Continue same-story backend/frontend synchronization discipline from project context.

- Git intelligence summary (recent continuity):
- `cbece05 role based access controlled`
- `feat(story-8.2): implement admin action audit trail and harden audit listing`
- `fix(story-8.1): finalize discrepancy investigation and close review`
- Keep recent pattern: hardening changes with regression tests and no unnecessary dependency churn.

- Library/framework requirements:
- Use current repository stack (`next@16.1.6`, `react@19.2.3`, `@prisma/client@6.x`, `zod@3.x`) already pinned in `package.json`.
- No dependency upgrades are required to deliver this story.

### Project Structure Notes

- Expected primary touch points:
- `app/api/**/route.ts` (targeted normalization only)
- `types/api.types.ts`
- `lib/api/client.ts`
- `lib/api/endpoints.ts`
- `services/**/*.service.ts`
- `hooks/**/*.ts` and `hooks/**/*.tsx`
- `tests/**` route-level suites for contract coverage

- Keep naming/location aligned with repository conventions:
- API handlers remain `route.ts` in App Router segments.
- Service files remain `*.service.ts`.
- Hooks remain `use-*.ts` / `use-*.tsx`.

### Testing Requirements

- Add route-level assertions that every touched endpoint family returns:
- Success shape: `{ success: true, data: ... }`
- Error shape: `{ success: false, error: string }`
- Ensure `401/403` deny responses still return safe error payloads without sensitive data.
- Add compatibility checks for existing client-consumed keys in representative contracts (no accidental field removals/renames).
- Verify updated service/hook typing compiles and matches runtime payloads.
- Execute standard validation gate before review handoff:
- `npm run lint`
- `npm test`
- `npm run build`

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 8, Story 8.4)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR40, NFR22, NFR6, NFR7)
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md` (API envelope consistency, layering, error taxonomy, boundary validation)
- Project sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story intelligence:
  - `_bmad-output/implementation-artifacts/8-3-rbac-boundary-enforcement-at-api-surface.md`
  - `_bmad-output/implementation-artifacts/8-3-rbac-coverage-matrix.md`
  - `_bmad-output/implementation-artifacts/8-2-audit-trail-for-critical-admin-actions.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Selected next backlog story from sprint status: `8-4-api-contract-consistency-and-version-safety`.
- Loaded Epic 8 and Story 8.4 context from planning artifacts and project context rules.
- Extracted continuity constraints from Stories 8.2 and 8.3 to preserve audit/RBAC behavior while standardizing API contracts.
- Ran route inventory and standardized representative route handlers with reusable response helpers in `lib/api-response.ts`.
- Added shared API envelope contract types in `types/api.types.ts` and synced admin audit service typing.
- Added contract compatibility guard tests for admin/customer/public/integration route classes (`tests/contracts/api-contract-compatibility.test.ts`).
- Executed targeted regression suites for modified routes and callback contracts.
- Validation gates:
- `npm run lint` (pass)
- `npm test` (partial pass: all `tests/**/*.test.ts` pass; `vitest` worker startup fails with existing `ERR_REQUIRE_ASYNC_MODULE` jsdom/css-color issue)
- `npm run build` (pass)

### Completion Notes List

- Implemented reusable API envelope helpers and applied them to representative admin/customer/public API routes.
- Preserved provider-specific callback response contracts for payment integrations while adding compatibility guard tests.
- Fixed strict TypeScript build blockers discovered during validation (`app/admin/audit/page.tsx` typing flow via service narrowing and `app/api/public/products/filters/route.ts` delete-on-non-optional pattern).
- Documented that no additional `lib/api/endpoints.ts` or hook contract shape changes were required for this story’s touched surface.

### File List

- _bmad-output/implementation-artifacts/8-4-api-contract-consistency-and-version-safety.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/admin/audit/route.ts
- app/api/notifications/route.ts
- app/api/public/products/route.ts
- app/api/public/products/filters/route.ts
- lib/api-response.ts
- lib/api/client.ts
- services/admin/audit.service.ts
- types/api.types.ts
- tests/contracts/api-contract-compatibility.test.ts

## Change Log

- 2026-04-19: Created Story 8.4 context file and marked status `ready-for-dev`.
- 2026-04-19: Implemented Story 8.4 API contract consistency updates, added compatibility tests, and moved status to `review`.

## Story Context Status

- Ready for review (`review`).
