# Story 8.3: RBAC Boundary Enforcement at API Surface

Status: ready-for-dev

## Story

As a security owner,  
I want all privileged APIs to enforce RBAC consistently,  
so that unauthorized access is blocked across admin and support surfaces.

## Acceptance Criteria

1. Given a protected API endpoint is invoked, when caller role lacks required permission, then access is denied with standardized error response and no sensitive data leakage.
2. Given a protected API endpoint is invoked, when caller role has required permission, then allowed operations execute normally.

## Tasks / Subtasks

- [ ] Establish a single RBAC enforcement primitive and policy map for privileged APIs (AC: 1, 2)
- [ ] Create an RBAC coverage matrix document (in-story section or companion markdown) mapping every protected endpoint to required role/policy and expected deny status (`401` vs `403`).
- [ ] Reuse `lib/session.ts` as the identity source; do not introduce parallel auth mechanisms.
- [ ] Add a centralized RBAC utility (for example `lib/rbac.ts`) that maps endpoint capability -> allowed roles and returns deterministic auth errors (`Unauthorized`, `Forbidden: ...`) compatible with existing route status mapping.
- [ ] Keep policy definitions explicit and discoverable (single source of truth), so routes do not embed ad-hoc role checks.

- [ ] Apply RBAC guardrails across protected API surface without changing functional business logic (AC: 1, 2)
- [ ] Audit and update `app/api/admin/**` handlers to use the centralized RBAC primitive consistently (including list/detail/mutation/reorder/status/investigation/audit endpoints).
- [ ] Audit and explicitly classify non-`admin/**` privileged endpoints, then enforce policy consistently for each class:
- [ ] Operational token-protected routes (e.g. `app/api/incentives/reconcile/route.ts`) must keep strict non-user token authorization behavior.
- [ ] Authenticated-but-sensitive asset routes (e.g. `app/api/upload/route.ts`, `app/api/upload/delete/route.ts`) must enforce authenticated caller policy and no leakage on deny paths.
- [ ] Customer-scoped protected routes (e.g. `app/api/orders/**`, `app/api/orders/reorder/route.ts`, `app/api/wishlist/route.ts`, `app/api/notifications/**`, `app/api/membership/benefits/route.ts`) must enforce ownership/isolation checks in addition to auth.
- [ ] Confirm customer-only endpoints in `app/api/orders`, `app/api/wishlist`, and user-scoped `app/api/notifications/**` remain protected by authenticated-user checks and reject cross-user access.
- [ ] Preserve existing route -> service/domain utility -> Prisma layering and avoid duplicating route trees.

- [ ] Standardize forbidden/unauthorized responses and leakage prevention at boundaries (AC: 1)
- [ ] Keep consistent envelope `{ success: false, error: string }` and deterministic HTTP status mappings (`401` unauthenticated, `403` unauthorized).
- [ ] Ensure RBAC-denied paths return no sensitive business payload (no entity details, provider metadata, or secrets in error responses).
- [ ] Preserve existing safe-error patterns used in Story 8.1 and Story 8.2 routes.

- [ ] Keep backend/frontend contracts synchronized for any RBAC-visible API behavior changes (AC: 1, 2)
- [ ] If response/error wording or status behavior changes for consumed endpoints, update `types/api.types.ts`, `lib/api/endpoints.ts`, and impacted services/hooks/components in the same story.
- [ ] If no consumer contract changes are needed, document this explicitly in completion notes.

- [ ] Add focused regression tests proving consistent RBAC behavior (AC: 1, 2)
- [ ] Add/extend route-level tests under `tests/admin/*` for `401` and `403` behavior on representative privileged endpoints (read + write).
- [ ] Add/extend tests for customer-scoped endpoints to validate user isolation and unauthorized access denial.
- [ ] Add assertions that denied responses never include protected payload fields.

## Dev Notes

- Scope boundaries:
- In scope: consistent RBAC enforcement and denial semantics across privileged API boundaries.
- Out of scope: broad role model redesign, permissions UI management, and global API versioning policy rollout (Story 8.4).

- Existing implementation baseline to extend (do not rebuild):
- Auth/session primitives:
  - `lib/session.ts` (`requireAuth`, `requireAdmin`, request-token fallback support)
- Privileged API surface:
  - `app/api/admin/**`
- Existing deterministic status/error mapping patterns:
  - `app/api/admin/orders/[id]/investigation/route.ts`
  - `app/api/admin/audit/route.ts`
  - `app/api/admin/categories/route.ts` and sibling admin handlers
- Existing test suites to extend:
  - `tests/admin/admin-order-investigation-routes.test.ts`
  - `tests/admin/admin-audit-routes.test.ts`
  - `tests/admin/admin-categories-routes.test.ts`
  - `tests/admin/admin-products-routes.test.ts`

- Architecture and compliance guardrails:
- Preserve standardized API envelopes and explicit authorization at API boundaries.
- Keep layered module pattern: route handlers -> domain/services/utilities -> Prisma.
- Prefer consolidating authorization logic rather than scattering role checks in each route.
- Avoid schema changes unless absolutely required; if `prisma/schema.prisma` changes, add matching migration in the same story.

- RBAC design constraints for this codebase:
- Current role model is `UserRole = ADMIN | CUSTOMER` in `prisma/schema.prisma`; there is no `SUPPORT` role today.
- AC2 can be satisfied by explicit allowlists per capability using existing roles.
- If introducing a new role becomes necessary, treat it as an explicit schema + contract change (migration, seed impact, type updates, endpoint behavior updates, and test matrix expansion).

- Previous story intelligence to preserve:
- Story 8.2 established safe admin-audit response shaping and allowlist projection; do not regress and leak restricted metadata fields.
- Story 8.1 established deterministic error/status mapping and DI-friendly handler structure for route tests; continue this pattern for RBAC checks.
- Maintain same-story backend/frontend synchronization discipline from project context rules.

- Git intelligence summary (recent continuity):
- `feat(story-8.2): implement admin action audit trail and harden audit listing`
- `fix(story-8.1): finalize discrepancy investigation and close review`
- `fix(story-7.4): finalize round-2 patches and epic-7 retrospective`
- Pattern to keep: boundary validation first, deterministic envelopes, and route-level regression coverage before marking review-ready.

- Latest technical information (validated April 18, 2026):
- Next.js 16 upgrade guide confirms async request-time APIs are mandatory in v16 (`cookies`, `headers`, `draftMode`, async `params`/`searchParams` usage in relevant contexts). Ensure RBAC helper integration does not rely on deprecated sync request-time access.
- Next.js support policy lists `16.x` as Active LTS; keep implementation aligned with current v16 conventions.
- Repository currently pins `next@16.1.6`, `react@19.2.3`, `@tanstack/react-query@5.x`, and `zod@3.x`; no dependency upgrades are required for this story.
- This story is a boundary-hardening change only; avoid dependency/version upgrades while implementing RBAC consistency.

### Project Structure Notes

- Expected primary touch points:
- `lib/session.ts`
- New shared RBAC helper (for example `lib/rbac.ts` or `lib/auth/rbac.ts`)
- `app/api/admin/**` route handlers (especially routes with custom auth mapping logic)
- Customer-protected routes (`app/api/orders/**`, `app/api/wishlist/**`, `app/api/notifications/**`) for isolation checks
- `tests/admin/*` and relevant non-admin route tests
- `types/api.types.ts`, `services/**`, `hooks/**`, `components/**` only if consumer-visible contract behavior changes

- Keep naming/location aligned with current conventions:
- Hooks in `hooks/use-*.ts[x]`
- Services in `services/*.service.ts` or `services/admin/*.service.ts`
- API handlers as `route.ts`

### Testing Requirements

- Build a test matrix from the RBAC coverage matrix and track each endpoint class: admin read, admin write, operational token route, authenticated user route, and ownership-constrained route.
- Verify all representative privileged endpoints return `401` for unauthenticated callers.
- Verify all representative privileged endpoints return `403` for authenticated non-admin callers.
- Verify authorized admin callers still receive successful responses for allowed operations.
- Verify denied responses preserve standardized envelope and do not expose protected data.
- Verify customer-scoped endpoints enforce resource ownership and reject cross-user access.
- Add/extend tests for non-`admin/**` privileged routes called out in scope (`upload`, `upload/delete`, `incentives/reconcile`) to prevent blind spots.
- Pass criteria for story completion:
- 100% endpoints listed in RBAC coverage matrix are either covered by automated tests or explicitly justified as non-testable with rationale.
- 100% protected endpoints use shared RBAC primitive/policy mapping (no new ad-hoc inline role checks).
- Run verification in project standard order before review handoff:
- `npm run lint`
- `npm test`
- `npm run build`

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 8, Story 8.3)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR39, FR40, NFR6, NFR7, NFR22)
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md` (API boundary auth, standardized envelopes, layered modules)
- Project sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story intelligence:
  - `_bmad-output/implementation-artifacts/8-2-audit-trail-for-critical-admin-actions.md`
  - `_bmad-output/implementation-artifacts/8-1-payment-and-order-discrepancy-investigation-workspace.md`
- Latest tech references:
  - https://nextjs.org/docs/app/guides/upgrading/version-16
  - https://nextjs.org/support-policy
  - https://www.prisma.io/changelog/2026-01-21
  - https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5
  - https://zod.dev/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Selected next backlog story from sprint status: `8-3-rbac-boundary-enforcement-at-api-surface`.
- Loaded and analyzed Epic 8 context from planning artifacts (`epics`, `prd`, `architecture`) plus project context rules.
- Extracted continuity constraints from Story 8.1 and Story 8.2 implementation artifacts.
- Reviewed current auth model and route boundary patterns (`lib/session.ts`, `app/api/admin/**`, `tests/admin/**`) to avoid duplicate authorization designs.
- Captured latest-framework constraints relevant to RBAC implementation safety on current stack versions.

### Completion Notes List

- Story context created for 8.3 with implementation-ready tasks, file-level guardrails, regression test expectations, and explicit anti-regression constraints.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- _bmad-output/implementation-artifacts/8-3-rbac-boundary-enforcement-at-api-surface.md

## Change Log

- 2026-04-18: Created Story 8.3 context file and marked status `ready-for-dev`.

## Story Context Status

- Ready for development (`ready-for-dev`).
