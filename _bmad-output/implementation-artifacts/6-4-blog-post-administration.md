# Story 6.4: Blog Post Administration

Status: done

## Story

As an admin,  
I want to manage blog posts, categories, and tags,  
so that marketing content can be published consistently.

## Acceptance Criteria

1. Given I am in blog admin area, when I create or edit posts and taxonomy, then content is persisted with publish controls and slug consistency.
2. Given I am in blog admin area, when I create or edit posts and taxonomy, then public blog routes index only published posts.
3. Given admin blog mutations are executed, when operations succeed or fail, then API responses preserve standardized contract (`{ success, data?, error? }`) and remain backward-compatible with current services/hooks.
4. Given blog admin routes are privileged operations, when requests reach `/api/admin/blog/*`, then RBAC is enforced consistently with explicit validation and safe error mapping.

## Tasks / Subtasks

- [x] Harden admin blog posts route validation, publish controls, and contract-safe error mapping (AC: 1, 3, 4)
- [x] Keep `/api/admin/blog/posts*` under explicit admin authorization with consistent 401/403 handling.
- [x] Validate create/update payload types (`title`, `slug`, `content`, `status`, `publishedAt`, `tagIds`, `categoryId`) and reject malformed body shapes instead of implicit coercion.
- [x] Preserve slug normalization and uniqueness behavior for both create/update flows.
- [x] Enforce deterministic publish-state handling (`DRAFT`/`PUBLISHED`/`ARCHIVED`) and `publishedAt` semantics without accidental flips.
- [x] Ensure post-tag relation updates are integrity-safe and idempotent for repeated updates.

- [x] Harden admin blog taxonomy (categories/tags) validation and lifecycle rules (AC: 1, 3, 4)
- [x] Keep `/api/admin/blog/categories*` and `/api/admin/blog/tags*` under explicit admin authorization with contract-safe errors.
- [x] Validate taxonomy payload types (`name`, `slug`, `description`, `displayOrder`, `isActive`) and reject malformed inputs.
- [x] Preserve slug uniqueness and normalization for category/tag create/update flows.
- [x] Keep delete constraints deterministic (`category` delete blocked when posts exist; `tag` relation cleanup remains safe).

- [x] Preserve public blog exposure rules and storefront compatibility (AC: 2, 3)
- [x] Keep `/api/blog/posts` and `/api/blog/posts/[slug]` constrained to published content only.
- [x] Ensure unpublished/archived posts are never exposed in public list/detail responses.
- [x] Preserve response shapes consumed by `services/blog.service.ts`, `hooks/use-blog.ts`, and `(web)` blog pages.

- [x] Add regression tests for admin + public blog surfaces (AC: 1..4)
- [x] Add admin route tests for posts/categories/tags authorization, payload validation, slug conflicts, and publish-state transitions.
- [x] Add public route tests for published-only filtering and safe behavior on invalid query parameters.
- [x] Extend or add suites under `tests/content/*` and `tests/admin/*` without duplicating existing test logic.
- [x] Reuse and extend existing public suites: `tests/content/public-blog-posts-routes.test.ts`, `tests/content/public-blog-post-detail-route.test.ts`; add focused admin suite (e.g., `tests/admin/admin-blog-routes.test.ts`) for `/api/admin/blog/*`.

### Review Findings

- [x] [Review][Patch] Blog post updates can erase historical `publishedAt` on non-publish edits/status transitions [app/api/admin/blog/posts/[id]/route.ts:253]
- [x] [Review][Patch] Blog post tag replacement is non-transactional and can persist partial writes if post update fails [app/api/admin/blog/posts/[id]/route.ts:326]

## Dev Notes

- Scope boundaries:
- In scope: hardening and contract correctness of existing blog admin/public APIs for posts/categories/tags.
- Out of scope: non-blog CMS routes already handled in Story 6.3, and broader admin operations in Epic 7/8.

- Existing implementation baseline to extend (do not rebuild):
- Admin APIs:
  - `app/api/admin/blog/posts/route.ts`
  - `app/api/admin/blog/posts/[id]/route.ts`
  - `app/api/admin/blog/posts/[id]/status/route.ts`
  - `app/api/admin/blog/categories/route.ts`
  - `app/api/admin/blog/categories/[id]/route.ts`
  - `app/api/admin/blog/tags/route.ts`
  - `app/api/admin/blog/tags/[id]/route.ts`
- Public APIs:
  - `app/api/blog/posts/route.ts`
  - `app/api/blog/posts/[slug]/route.ts`
  - `app/api/blog/categories/route.ts`
  - `app/api/blog/tags/route.ts`
- Admin client layer:
  - `services/admin/blog-posts.service.ts`, `hooks/admin/use-blog-posts.ts`
  - `services/admin/blog-categories.service.ts`, `hooks/admin/use-blog-categories.ts`
  - `services/admin/blog-tags.service.ts`, `hooks/admin/use-blog-tags.ts`
- Admin UI:
  - `app/admin/blog/posts/page.tsx`
  - `app/admin/blog/categories/page.tsx`
  - `app/admin/blog/tags/page.tsx`
- Storefront/UI consumers:
  - `services/blog.service.ts`, `hooks/use-blog.ts`
  - `app/(web)/blog/page.tsx`, `app/(web)/blog/[slug]/page.tsx`
- Data model:
  - `prisma/schema.prisma` (`BlogPost`, `BlogCategory`, `BlogTag`, `BlogPostTag`, `BlogPostStatus`)

- Previous story intelligence (6.3) to preserve:
- Keep strict type validation at route boundaries; avoid permissive coercion for booleans/numbers/enums.
- Keep standardized response envelope and deterministic status mapping across admin routes.
- Keep safe error mapping for privileged admin routes (do not expose raw internal exception details on 500s).
- Keep route-level tests as primary regression guardrails before closing story.

- Architecture and project guardrails:
- Preserve route -> service -> domain utility -> Prisma layering.
- Preserve API envelope: `{ success, data?, error? }`.
- Avoid introducing parallel `v2` blog APIs; harden current endpoints in place.
- Follow backend-frontend sync rule: any contract changes must be reflected in services/hooks/call sites in same story.

### Project Structure Notes

- Expected primary touch points:
- `app/api/admin/blog/posts/route.ts`
- `app/api/admin/blog/posts/[id]/route.ts`
- `app/api/admin/blog/posts/[id]/status/route.ts`
- `app/api/admin/blog/categories/route.ts`
- `app/api/admin/blog/categories/[id]/route.ts`
- `app/api/admin/blog/tags/route.ts`
- `app/api/admin/blog/tags/[id]/route.ts`
- `app/api/blog/posts/route.ts`
- `app/api/blog/posts/[slug]/route.ts`
- `services/admin/blog-posts.service.ts`
- `services/admin/blog-categories.service.ts`
- `services/admin/blog-tags.service.ts`
- `hooks/admin/use-blog-posts.ts`
- `hooks/admin/use-blog-categories.ts`
- `hooks/admin/use-blog-tags.ts`
- `services/blog.service.ts`
- `hooks/use-blog.ts`
- `tests/admin/*`
- `tests/content/*`

- Keep naming and placement consistent with current app-router convention and domain slices.

### Testing Requirements

- Verify admin authorization and contract-safe error handling for all `/api/admin/blog/*` routes.
- Verify create/update payload validation rejects malformed primitives and invalid enum values.
- Verify slug normalization/uniqueness behavior for posts/categories/tags.
- Verify publish controls: public endpoints return published posts only; unpublished/archived are hidden.
- Verify tag/category mutation rules preserve relational integrity and deterministic behavior.
- Verify admin services/hooks remain compatible with any route hardening and query invalidation remains deterministic.
- Prefer extending `tests/content/public-blog-posts-routes.test.ts` and `tests/content/public-blog-post-detail-route.test.ts`, and add a dedicated admin suite for blog routes (`tests/admin/admin-blog-routes.test.ts` or equivalent).

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.4)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR24, FR31, FR39, FR40)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (Content/Comms + admin boundaries + envelope consistency)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Previous story learnings: `_bmad-output/implementation-artifacts/6-3-banner-static-page-and-menu-administration.md`
- Data model source: `prisma/schema.prisma` (`BlogPost*`, taxonomy models, status enum)
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma relation queries docs: https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Created Story 6.4 context file from Epic 6, architecture constraints, project context sync rules, and Story 6.3 implementation learnings.
- Hardened `/api/admin/blog/*` routes with strict payload validation, slug checks, relational integrity checks, deterministic publish controls, and safe 500 error mapping.
- Validation commands:
  - `npx tsx --test tests/admin/admin-blog-routes.test.ts tests/content/public-blog-posts-routes.test.ts tests/content/public-blog-post-detail-route.test.ts`
  - `npx tsc --noEmit -p tsconfig.json`
  - `npx eslint app/api/admin/blog/posts/route.ts "app/api/admin/blog/posts/[id]/route.ts" "app/api/admin/blog/posts/[id]/status/route.ts" app/api/admin/blog/categories/route.ts "app/api/admin/blog/categories/[id]/route.ts" app/api/admin/blog/tags/route.ts "app/api/admin/blog/tags/[id]/route.ts" tests/admin/admin-blog-routes.test.ts`

### Completion Notes List

- Story context prepared for blog admin hardening with explicit API, validation, RBAC, and regression-test guardrails.
- Story status initialized to `ready-for-dev`.
- Implemented strict create/update validation for blog posts/categories/tags and normalized safe error mapping across all admin blog routes.
- Implemented deterministic publish-state behavior for post create/update/status mutations (`publishedAt` set/cleared by status).
- Added dedicated admin regression suite `tests/admin/admin-blog-routes.test.ts` and kept public blog tests green.
- Preserved existing frontend service/hook compatibility and response envelopes.

### File List

- _bmad-output/implementation-artifacts/6-4-blog-post-administration.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/story-validation-report-6-4-blog-post-administration-2026-04-10.md
- app/api/admin/blog/posts/route.ts
- app/api/admin/blog/posts/[id]/route.ts
- app/api/admin/blog/posts/[id]/status/route.ts
- app/api/admin/blog/categories/route.ts
- app/api/admin/blog/categories/[id]/route.ts
- app/api/admin/blog/tags/route.ts
- app/api/admin/blog/tags/[id]/route.ts
- tests/admin/admin-blog-routes.test.ts

## Change Log

- 2026-04-10: Created Story 6.4 context file with implementation guardrails for blog post/category/tag administration.
- 2026-04-10: Validated Story 6.4 context; tightened test-target guidance for existing public blog suites and dedicated admin blog route coverage.
- 2026-04-10: Implemented Story 6.4 admin blog route hardening and regression tests; story moved to `review`.
- 2026-04-10: Applied CR fixes for `publishedAt` preservation and transactional post/tag updates; story moved to `done`.

## Story Context Status

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story implementation and code review fixes completed; status set to `done`.
