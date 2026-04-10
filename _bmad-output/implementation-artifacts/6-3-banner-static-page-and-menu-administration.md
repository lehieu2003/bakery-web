# Story 6.3: Banner, Static Page, and Menu Administration

Status: done

## Story

As an admin,  
I want to manage banners and static pages,  
so that promotional and legal content stays current.

## Acceptance Criteria

1. Given content admin modules are available, when I publish or update banners/pages/menu links, then storefront displays updated content in expected placements.
2. Given content admin modules are available, when I publish or update banners/pages/menu links, then unpublished drafts are not exposed publicly.
3. Given admin content mutations are executed, when operations succeed or fail, then API responses preserve the standardized contract (`{ success, data?, error? }`) and remain backward-compatible for existing services/hooks.
4. Given admin content routes are privileged operations, when requests reach `/api/admin/{banners|pages|menu}*`, then RBAC is enforced consistently with explicit validation and safe error mapping.

## Tasks / Subtasks

- [x] Harden admin banner route validation, auth consistency, and reorder safety (AC: 1, 3, 4)
- [x] Keep `/api/admin/banners*` under explicit admin authorization with consistent 401/403 handling and response envelope mapping.
- [x] Validate banner create/update payload types (`title`, `displayOrder`, `isActive`, URL fields) and reject malformed body shapes instead of implicit coercion.
- [x] Validate `/api/admin/banners/reorder` payload for duplicate ids, missing ids, and non-integer `displayOrder`; preserve deterministic ordering writes.
- [x] Keep banner write operations compatible with existing admin client layer (`services/admin/banners.service.ts`, `hooks/admin/use-banners.ts`) without introducing parallel endpoints.

- [x] Harden static page admin flow and publish gating semantics (AC: 1, 2, 3, 4)
- [x] Keep `/api/admin/pages*` under consistent admin auth and envelope behavior; preserve slug uniqueness and deterministic normalization.
- [x] Ensure `isPublished` mutation behavior is explicit and type-safe (no accidental draft/public flips from malformed payloads).
- [x] Preserve public page visibility rule in `/api/public/pages*`: only published pages are returned/exposed.
- [x] Keep content mutation compatibility with `services/admin/pages.service.ts` and `hooks/admin/use-pages.ts`.

- [x] Harden menu administration rules and public navigation correctness (AC: 1, 2, 3, 4)
- [x] Keep `/api/admin/menu*` under consistent admin auth and validation (type-safe `MenuType`, valid `parentId/categoryId/pageId` references, no invalid self/loop parent relationships).
- [x] Preserve public menu visibility in `/api/public/menu`: only active items and valid parent-child trees.
- [x] Ensure menu items targeting pages do not expose unpublished pages in public navigation resolution paths.
- [x] Keep compatibility with `services/admin/menu.service.ts`, `hooks/admin/use-menu.ts`, and `app/admin/menu/page.tsx`.

- [x] Align storefront consumption paths for banners/pages/menu placement expectations (AC: 1, 2, 3)
- [x] Verify public banner consumption remains active-only and ordered (`/api/public/banners`, `services/banners.service.ts`, `hooks/use-banners.ts`).
- [x] Verify storefront navigation/page routes consume public menu/pages safely and do not leak unpublished content.
- [x] If additional menu consumption is introduced in `components/web/navbar.tsx` or layout paths, keep backward-compatible rendering and avoid category navigation regressions.

- [x] Add regression tests for admin + public content surfaces (AC: 1..4)
- [x] Add admin route tests for banners/pages/menu auth, payload validation, and contract-safe error handling.
- [x] Add public route tests for active/published filtering on banners/pages/menu endpoints.
- [x] Add menu tree edge-case tests (invalid parent references, inactive nodes, page-link to unpublished page).
- [x] Extend `tests/content/public-pages-routes.test.ts` and add focused suites (or equivalent) such as `tests/content/public-menu-routes.test.ts`, `tests/content/public-banners-routes.test.ts`, and `tests/admin/admin-content-routes.test.ts` without duplicating existing category/attribute test logic.

### Review Findings

- [x] [Review][Patch] Hidden descendants can be promoted to public menu roots when parent is filtered out [app/api/public/menu/route.ts:48]
- [x] [Review][Patch] `displayOrder` parsing still coerces non-numeric payloads instead of rejecting malformed input [app/api/admin/banners/route.ts:69]
- [x] [Review][Patch] Parent-cycle guard can loop indefinitely on pre-existing cyclic menu data [app/api/admin/menu/[id]/route.ts:203]
- [x] [Review][Patch] `isPublished` handling in admin pages still silently coerces malformed payloads (story requirement gap) [app/api/admin/pages/route.ts:51]
- [x] [Review][Defer][Resolved] Admin error messages expose raw exception text in menu routes [app/api/admin/menu/route.ts:229] — follow-up applied with safe 500 error mapping

## Dev Notes

- Scope boundaries:
- In scope: admin CRUD hardening and public exposure correctness for banners, static pages, and menu links.
- Out of scope: blog post/category/tag administration (Story 6.4), product/category/attribute workflows (Stories 6.1/6.2), order/customer dashboards (Epic 7).

- Existing implementation baseline to extend (do not rebuild):
- Admin APIs:
  - `app/api/admin/banners/route.ts`
  - `app/api/admin/banners/[id]/route.ts`
  - `app/api/admin/banners/reorder/route.ts`
  - `app/api/admin/pages/route.ts`
  - `app/api/admin/pages/[id]/route.ts`
  - `app/api/admin/menu/route.ts`
  - `app/api/admin/menu/[id]/route.ts`
- Public APIs:
  - `app/api/public/banners/route.ts`
  - `app/api/public/pages/route.ts`
  - `app/api/public/pages/[slug]/route.ts`
  - `app/api/public/menu/route.ts`
- Admin client layer:
  - `services/admin/banners.service.ts`, `hooks/admin/use-banners.ts`
  - `services/admin/pages.service.ts`, `hooks/admin/use-pages.ts`
  - `services/admin/menu.service.ts`, `hooks/admin/use-menu.ts`
- Admin UI:
  - `app/admin/banners/page.tsx`
  - `app/admin/pages/page.tsx`
  - `app/admin/menu/page.tsx`
- Public/UI consumers:
  - `services/banners.service.ts`, `hooks/use-banners.ts`
  - `components/web/navbar.tsx`
  - `app/(web)/layout.tsx`
- Data model:
  - `prisma/schema.prisma` (`Banner`, `Page`, `MenuItem`, `MenuType`)

- Previous story intelligence (6.2) to preserve:
- Keep strict boolean/type validation at route boundaries (avoid coercion bugs).
- Preserve deterministic ordering and integrity checks for hierarchy-like data.
- Maintain explicit RBAC enforcement on all `/api/admin/*` reads and writes.
- Keep response envelope consistency and route-level tests as primary regression guard.

- Architecture and project guardrails:
- Preserve route -> service -> domain utility -> Prisma layering.
- Preserve API response shape: `{ success, data?, error? }`.
- Avoid duplicate endpoints/workflows; reuse existing admin services/hooks and query keys.
- Follow backend-frontend sync rule from project context in same story when API contracts change.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/banners/route.ts`
- `app/api/admin/banners/[id]/route.ts`
- `app/api/admin/banners/reorder/route.ts`
- `app/api/admin/pages/route.ts`
- `app/api/admin/pages/[id]/route.ts`
- `app/api/admin/menu/route.ts`
- `app/api/admin/menu/[id]/route.ts`
- `app/api/public/banners/route.ts`
- `app/api/public/pages/route.ts`
- `app/api/public/pages/[slug]/route.ts`
- `app/api/public/menu/route.ts`
- `app/admin/banners/page.tsx`
- `app/admin/pages/page.tsx`
- `app/admin/menu/page.tsx`
- `services/admin/banners.service.ts`
- `services/admin/pages.service.ts`
- `services/admin/menu.service.ts`
- `hooks/admin/use-banners.ts`
- `hooks/admin/use-pages.ts`
- `hooks/admin/use-menu.ts`
- `tests/admin/*`, `tests/content/*`

- Anti-reinvention guidance:
- Reuse existing admin modules and public endpoints; do not create `v2` content APIs.
- Reuse existing slug normalization helper (`lib/slug.ts`) for page slug behavior.
- Keep React Query invalidation patterns aligned with existing key namespaces (`bannerKeys`, `pageKeys`, `menuKeys`).

### Testing Requirements

- Verify admin authorization and contract-safe error handling for all `/api/admin/banners*`, `/api/admin/pages*`, `/api/admin/menu*` routes.
- Verify create/update payload validation rejects malformed booleans, invalid enum values, and invalid parent/reference ids.
- Verify public routes only expose active/published content (`/api/public/banners`, `/api/public/pages`, `/api/public/pages/[slug]`, `/api/public/menu`).
- Verify menu tree building is stable for mixed root/child data and invalid parent references.
- Verify page publish-state transitions are reflected correctly in admin while public endpoints remain draft-safe.
- Verify admin services/hooks remain compatible after backend hardening and query invalidation remains deterministic.
- Prefer route-level tests in `tests/content/public-pages-routes.test.ts` plus new content/admin route suites as needed for banner/menu and admin content mutations.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.3)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR29, FR30, FR39, FR40, NFR6, NFR8, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (RBAC on `/api/admin/*`, response envelope consistency, route->service->domain layering)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story learnings: `_bmad-output/implementation-artifacts/6-2-category-hierarchy-and-attribute-metadata-management.md`
- Data model: `prisma/schema.prisma` (`MenuType`, `MenuItem`, `Page`, `Banner`)
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma transactions docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Hardened admin banner routes with typed payload parsing, strict RBAC error mapping, and reorder validation.
- Hardened admin menu create/update routes with enum/target validation, parent checks, and cycle prevention.
- Hardened public content routes with handler exports and safe filtering for menu items targeting unpublished pages.
- Validation commands:
  - `npx tsx --test tests/admin/admin-content-routes.test.ts tests/content/public-pages-routes.test.ts tests/content/public-banners-routes.test.ts tests/content/public-menu-routes.test.ts`
  - `npx tsc --noEmit -p tsconfig.json`

### Completion Notes List

- Added handler-based admin banner APIs with strict validation for create/update/reorder and consistent auth/status behavior.
- Added handler-based admin menu APIs with strict type/reference validation and partial-update safety (prevents accidental field nulling).
- Added public handlers and tests for banners/menu; menu now excludes PAGE links to unpublished pages.
- Added route-level regression tests under `tests/admin/admin-content-routes.test.ts`, `tests/content/public-banners-routes.test.ts`, and `tests/content/public-menu-routes.test.ts`.
- Kept pages publish-gating behavior intact and validated via existing `tests/content/public-pages-routes.test.ts`.

### File List

- _bmad-output/implementation-artifacts/6-3-banner-static-page-and-menu-administration.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/admin/banners/route.ts
- app/api/admin/banners/[id]/route.ts
- app/api/admin/banners/reorder/route.ts
- app/api/admin/menu/route.ts
- app/api/admin/menu/[id]/route.ts
- app/api/public/banners/route.ts
- app/api/public/menu/route.ts
- tests/admin/admin-content-routes.test.ts
- tests/content/public-banners-routes.test.ts
- tests/content/public-menu-routes.test.ts

## Change Log

- 2026-04-10: Created Story 6.3 context file with implementation guardrails for banner, static page, and menu administration.
- 2026-04-10: Implemented Story 6.3 API hardening for banner/menu admin and public content filtering with route-level regression tests; status moved to `review`.

## Story Context Status

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story implementation completed and status set to `review`.
