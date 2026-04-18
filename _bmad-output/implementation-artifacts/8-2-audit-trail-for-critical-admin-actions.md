# Story 8.2: Audit Trail for Critical Admin Actions

Status: review

## Story

As a governance stakeholder,  
I want complete audit visibility for critical changes,  
so that operational accountability is preserved.

## Acceptance Criteria

1. Given an admin performs a critical action, when the action is committed, then audit records capture actor, timestamp, entity, change summary, and request correlation metadata.
2. Given audit records exist, when an authorized reviewer queries logs, then results are available without exposing restricted payload fields.

## Tasks / Subtasks

- [x] Define and enforce a shared "critical admin action" audit contract (AC: 1, 2)
- [x] Create or extend a centralized audit writer utility in `lib/` that standardizes required fields: `actorUserId`, `actorRole`, `mutationType`, `entity`, `entityId`, `summary`, `correlation metadata`, `beforeData`, `afterData`, `createdAt`.
- [x] Make correlation metadata explicit and consistent across modules: include `requestId`, `route`, `httpMethod`, and story-relevant keys when available (`orderId`, `paymentId`, `transactionId`, `attempt`).
- [x] Reuse existing audit tables/writers (`OrderAuditLog`, `ProductAuditLog`, `SettingAuditLog`) where possible; only introduce a unified audit table if coverage gaps cannot be addressed safely with existing models.
- [x] If `prisma/schema.prisma` is changed, add a matching migration under `prisma/migrations/` in the same story.

- [x] Expand audit coverage to critical admin mutations without duplicating business logic (AC: 1)
- [x] Ensure all critical mutation routes write audit logs at commit time, prioritizing:
- [x] `app/api/admin/orders/[id]/route.ts` (status transitions and critical order operations)
- [x] `app/api/admin/products/route.ts` and `app/api/admin/products/[id]/route.ts` (already covered; align shape if needed)
- [x] `app/api/admin/settings/route.ts` and `app/api/admin/membership/route.ts` (already covered; align shape if needed)
- [x] `app/api/admin/categories/**`, `app/api/admin/banners/**`, `app/api/admin/pages/**`, `app/api/admin/blog/**` (add missing critical-action audits where absent)
- [x] Keep route -> service/domain utility layering intact; do not add parallel v2 admin route trees for this story.

- [x] Provide reviewer query capability for audit logs with safe filtering (AC: 2)
- [x] Add/extend admin audit read endpoints using deterministic envelopes `{ success, data?, error? }` and `requireAdmin` auth checks.
- [x] Support practical filters (entity/module, actor, mutation type, date range, pagination) with strict boundary validation and deterministic `400` responses for invalid inputs.
- [x] Ensure query paths never expose restricted payload fields (secrets, signatures, raw provider payloads, credentials, tokens).
- [x] Use server-side allowlist projection for reviewer responses so redaction is deterministic even when new metadata keys are introduced later.

- [x] Synchronize contracts across API, services, hooks, and admin UI consumers (AC: 1, 2)
- [x] Update `types/api.types.ts` for audit list/detail payloads and filter params.
- [x] Update `lib/api/endpoints.ts`, admin services in `services/admin/*.service.ts`, and hooks in `hooks/admin/*.ts` in the same change set.
- [x] Add/extend admin UI surface (existing admin pages or a dedicated audit review surface) so authorized reviewers can inspect logs with filters and pagination.

- [x] Add focused regression tests for audit integrity and safe access (AC: 1, 2)
- [x] Add route-level tests under `tests/admin/*` for auth (`401`/`403`), validation (`400`), and envelope consistency.
- [x] Add tests proving critical mutations emit audit entries with required metadata fields.
- [x] Add tests proving restricted fields are redacted/omitted in audit query responses.

## Dev Notes

- Scope boundaries:
- In scope: audit completeness and queryability for critical admin actions, with safe exposure controls.
- Out of scope: broad RBAC redesign across all endpoints (Story 8.3) and global API version policy rollout (Story 8.4).

- Existing implementation baseline to extend (do not rebuild):
- Audit writers/models:
  - `lib/order-audit.ts`
  - `lib/product-audit.ts`
  - `lib/setting-audit.ts`
  - `prisma/schema.prisma` models: `OrderAuditLog`, `ProductAuditLog`, `SettingAuditLog`, `CouponAuditLog`
- Existing audit read routes:
  - `app/api/admin/orders/[id]/audit/route.ts`
  - `app/api/admin/products/[id]/audit/route.ts`
- Existing admin investigation work (Story 8.1) that already captures payment callback diagnostics:
  - `app/api/admin/orders/[id]/investigation/route.ts`
  - `app/api/payment/momo/callback/route.ts`
  - `app/api/payment/zalopay/callback/route.ts`

- Architecture and contract guardrails:
- Preserve standardized response envelopes and explicit auth at API boundaries (`requireAdmin`).
- Keep layering: route handlers -> domain/service utilities -> Prisma.
- Preserve backend/frontend sync rule: any API contract change must include type/service/hook/UI updates in the same story.
- Reuse current patterns for pagination normalization and deterministic error mapping from existing admin audit routes.
- Treat redaction as default-deny: return only explicit safe fields in audit query responses, never pass through raw metadata wholesale.

- Previous story intelligence to preserve (from Story 8.1):
- Keep sensitive-field sanitization for callback-related metadata; never expose raw provider payload/signatures.
- Keep DI-friendly route handler exports where practical for isolated route tests.
- Keep deterministic validation behavior for malformed identifiers/filters.

- Git intelligence summary (recent pattern continuity):
- `fix(story-8.1): finalize discrepancy investigation and close review`
- `fix(story-7.4): finalize round-2 patches and epic-7 retrospective`
- `fix(story-7.4): address dashboard review findings`
- `feat(story-7.3): harden membership and store settings admin flows`
- Pattern to follow: close the story with route-level tests, strict envelope/auth handling, and same-story contract synchronization.

- Library/framework requirements:
- Use existing stack in `package.json` (Next.js App Router + React + TypeScript + Prisma). No new framework adoption is required for this story.
- Prefer extending existing utilities/components over introducing new dependency surface area.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/**` mutation and audit-read routes (especially categories, banners, pages, blog, orders)
- `lib/order-audit.ts`, `lib/product-audit.ts`, `lib/setting-audit.ts` (and any new shared audit utility if required)
- `types/api.types.ts`
- `lib/api/endpoints.ts`
- `services/admin/*.service.ts`
- `hooks/admin/*.ts`
- `app/admin/**` audit review UI surfaces
- `tests/admin/*`
- `prisma/schema.prisma` + `prisma/migrations/*` only if schema changes are necessary

### Testing Requirements

- Verify critical admin mutations emit audit entries with actor, timestamp, entity, summary, and correlation metadata.
- Verify correlation metadata shape is consistent (`requestId`, `route`, `httpMethod`, plus domain keys when present).
- Verify audit query endpoints enforce admin authorization and safe error mappings (`401`, `403`, `400`, `500`).
- Verify pagination/filter normalization and deterministic response shape.
- Verify restricted metadata fields are excluded/redacted in reviewer-facing responses.
- Verify API/types/services/hooks/UI remain synchronized when contract changes are introduced.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 8, Story 8.2)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR38, FR39, FR40, NFR6, NFR8, NFR21, NFR22)
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md` (RBAC at API boundary, API envelope consistency, layered module pattern)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story intelligence:
  - `_bmad-output/implementation-artifacts/8-1-payment-and-order-discrepancy-investigation-workspace.md`
  - `_bmad-output/implementation-artifacts/story-validation-report-8-1-payment-and-order-discrepancy-investigation-workspace-2026-04-17.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Selected next backlog story from sprint status: `8-2-audit-trail-for-critical-admin-actions`.
- Analyzed Epic 8 acceptance criteria and architecture/PRD constraints.
- Reused prior-story learnings from Story 8.1 to preserve sanitization, deterministic validation, and route-test patterns.
- Mapped existing audit infrastructure and identified expected extension points for critical admin mutations.
- Implemented shared admin-action audit utility with explicit correlation metadata contract (`requestId`, `route`, `httpMethod`, plus optional order/payment keys) and centralized metadata shape.
- Added new reviewer-facing audit API `GET /api/admin/audit` with strict query validation, deterministic pagination, and allowlist-based projection that never returns raw metadata.
- Wired admin-action audit writes into critical mutation routes for categories, banners, pages, and blog posts/categories/tags (create/update/delete plus blog status updates).
- Added audit client contract and UI integration: endpoints/types/service/hook plus admin audit log page.
- Added regression tests covering audit endpoint auth/validation/redaction and category create audit correlation behavior.

### Completion Notes List

- Completed Story 8.2 implementation and moved status to `review`.
- Added `lib/admin-action-audit.ts` and reused existing `SettingAuditLog` as the centralized persistence path for cross-module critical admin action auditing.
- Delivered `/api/admin/audit` query surface with safe, allowlisted response fields and filter support (`module`, `entity`, `actorUserId`, `mutationType`, `from`, `to`, pagination).
- Synced backend/frontend contract updates (`types`, endpoints, service, hook, admin UI page, sidebar nav).
- Validation summary:
- `npx tsc --noEmit -p tsconfig.json` (pass)
- `npx tsx --test tests/admin/admin-audit-routes.test.ts tests/admin/admin-categories-routes.test.ts tests/admin/admin-content-routes.test.ts tests/admin/admin-blog-routes.test.ts` (pass)
- `npm run lint` (pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)
- `npm test` (node tests pass; pre-existing Vitest worker issue `ERR_REQUIRE_ASYNC_MODULE` remains)

### File List

- _bmad-output/implementation-artifacts/8-2-audit-trail-for-critical-admin-actions.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/admin/audit/page.tsx
- app/api/admin/audit/route.ts
- app/api/admin/banners/[id]/route.ts
- app/api/admin/banners/route.ts
- app/api/admin/blog/categories/[id]/route.ts
- app/api/admin/blog/categories/route.ts
- app/api/admin/blog/posts/[id]/route.ts
- app/api/admin/blog/posts/[id]/status/route.ts
- app/api/admin/blog/posts/route.ts
- app/api/admin/blog/tags/[id]/route.ts
- app/api/admin/blog/tags/route.ts
- app/api/admin/categories/[id]/route.ts
- app/api/admin/categories/route.ts
- app/api/admin/pages/[id]/route.ts
- app/api/admin/pages/route.ts
- components/admin/AdminSidebar.tsx
- hooks/admin/index.ts
- hooks/admin/use-audit.ts
- lib/admin-action-audit.ts
- lib/api/endpoints.ts
- services/admin/audit.service.ts
- services/admin/index.ts
- tests/admin/admin-audit-routes.test.ts
- tests/admin/admin-categories-routes.test.ts
- types/api.types.ts

## Change Log

- 2026-04-18: Created Story 8.2 context file and marked story status as `ready-for-dev`.
- 2026-04-18: Implemented Story 8.2 audit trail enhancements (shared admin audit utility, audit query API, UI surface, route integrations, and regression tests); marked status `review`.

## Story Context Status

- Ready for review (`review`).
