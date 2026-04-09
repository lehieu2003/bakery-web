# Story 6.2: Category Hierarchy and Attribute Metadata Management

Status: done

## Story

As an admin,  
I want to manage category hierarchy and filter metadata,  
so that product discovery structure remains coherent.

## Acceptance Criteria

1. Given category and attribute definitions exist, when I modify hierarchy/order or attribute metadata, then storefront browse and filter endpoints reflect the new taxonomy.
2. Given category and attribute mutations are executed, when operations succeed or fail, then API responses preserve the standardized contract (`{ success, data?, error? }`) and avoid regressions in existing admin hooks/services.
3. Given category tree and attribute relationships are edited, when updates are persisted, then referential integrity is preserved (no invalid parent loops, no orphan/invalid attribute-value relationships).
4. Given existing category/filter flows are in production use, when Story 6.2 is implemented, then behavior remains backward-compatible for public browse/filter APIs and current admin surfaces.

## Tasks / Subtasks

- [x] Harden admin category management boundaries and validation (AC: 1, 2, 3, 4)
  - [x] Ensure `/api/admin/categories*` mutating endpoints enforce admin authorization consistently.
  - [x] Enforce admin authorization for list/detail reads under `/api/admin/categories*` and `/api/admin/product-attributes*`; if public reads are needed, keep them on `/api/public/categories*` or existing public filter endpoints.
  - [x] Validate parent reassignment rules to prevent self-parenting/cycles and enforce depth/level consistency.
  - [x] Keep `slug` uniqueness and input normalization deterministic for create/update.

- [x] Complete hierarchy reorder + integrity safeguards (AC: 1, 3, 4)
  - [x] Harden `/api/admin/categories/reorder` payload validation (ids existence, duplicates, numeric bounds).
  - [x] Apply reorder writes transactionally with clear failure behavior.
  - [x] Preserve tree consistency for `parentId`, `level`, and `displayOrder` after edits.
  - [x] Keep category delete rules safe for child categories and attached products.

- [x] Harden product-attribute metadata lifecycle (AC: 1, 2, 3, 4)
  - [x] Validate `ProductAttribute` (`slug`, `code`, `type`) and `ProductAttributeValue` uniqueness/normalization consistently across create/update.
  - [x] Enforce value ownership checks (`valueId` belongs to `attributeId`) for assignment and mutation paths.
  - [x] Preserve backward compatibility for existing `attributeFilters` query behavior and filter payload shapes.
  - [x] Keep response envelopes and status mapping consistent across `/api/admin/product-attributes*`.

- [x] Align client integration for admin category + attribute modules (AC: 2, 4)
  - [x] Verify `services/admin/categories.service.ts` and `hooks/admin/use-categories.ts` remain contract-safe.
  - [x] Verify `services/admin/product-attributes.service.ts` and `hooks/admin/use-product-attributes.ts` invalidation keys remain deterministic.
  - [x] Verify admin pages `app/admin/categories/page.tsx` and `app/admin/product-attributes/page.tsx` do not regress due to API shape/status changes.

- [x] Add regression tests for category hierarchy + attribute metadata behavior (AC: 1..4)
  - [x] Add route-level tests for category create/update/delete/reorder authorization and validation.
  - [x] Add route-level tests for attribute create/update/delete validation and value uniqueness constraints.
  - [x] Add edge-case tests for hierarchy cycle prevention and invalid parent/value references.
- [x] Add focused tests for public browse/filter compatibility after taxonomy updates.
- [x] Add/extend tests in `tests/admin/admin-categories-routes.test.ts` and `tests/admin/admin-product-attributes-routes.test.ts` (or equivalent route test files) to keep CI coverage explicit.

### Review Findings

- [x] [Review][Patch] Prevent boolean coercion on category create flags (`isActive`, `showInMenu`) [app/api/admin/categories/route.ts:101]
- [x] [Review][Patch] Validate boolean types in product-attribute create payload (`isRequired`, `isFilterable`, `isVariantAxis`, `isActive`) [app/api/admin/product-attributes/route.ts:253]
- [x] [Review][Patch] Validate boolean types in product-attribute update payload (`isRequired`, `isFilterable`, `isVariantAxis`, `isActive`) [app/api/admin/product-attributes/[id]/route.ts:326]
- [x] [Review][Patch] Guard `collectDescendants` against cyclic category graphs with a visited set [app/api/admin/categories/[id]/route.ts:218]
- [x] [Review][Patch] Ensure deterministic ordering when duplicate `displayOrder` exists (payload validation or stable secondary sort) [app/api/admin/categories/reorder/route.ts:74]
- [x] [Review][Patch] Re-fetch category tree after descendant level updates to avoid stale response payload [app/api/admin/categories/[id]/route.ts:363]
- [x] [Review][Patch] Add regression tests for invalid boolean payload rejection on categories/product-attributes create/update [tests/admin/admin-categories-routes.test.ts:35]

## Dev Notes

- Scope boundaries:
  - In scope: category hierarchy operations, reorder safety, product-attribute metadata integrity, admin integration compatibility.
  - Out of scope: banner/page/menu administration (Story 6.3), blog admin (Story 6.4), product/variant CRUD (Story 6.1).

- Existing implementation baseline to build on:
  - Category APIs: `app/api/admin/categories/route.ts`, `app/api/admin/categories/[id]/route.ts`, `app/api/admin/categories/reorder/route.ts`
  - Attribute APIs: `app/api/admin/product-attributes/route.ts`, `app/api/admin/product-attributes/[id]/route.ts`
  - Admin client layer: `services/admin/categories.service.ts`, `hooks/admin/use-categories.ts`, `services/admin/product-attributes.service.ts`, `hooks/admin/use-product-attributes.ts`
  - Admin UI: `app/admin/categories/page.tsx`, `app/admin/product-attributes/page.tsx`
  - Public consumption touchpoints: `app/api/public/categories/route.ts`, `app/api/public/products/filters/route.ts`
  - Schema models: `Category`, `ProductCategory`, `ProductAttribute`, `ProductAttributeValue`, `ProductAttributeAssignment` in `prisma/schema.prisma`

- Previous story intelligence (6.1):
  - Keep mutation boundaries strict and product/admin writes fully server-validated.
  - Preserve envelope/status consistency and deterministic error mapping.
  - Add route-level tests for critical mutation paths before moving to review.

- Architecture guardrails:
  - Preserve route -> service -> domain utility -> Prisma layering.
  - Keep privileged mutation routes under `/api/admin/*` with RBAC enforced.
  - Preserve API response shape: `{ success, data?, error? }`.
  - Follow backend/frontend sync rule from project context in the same story whenever API contract changes.

### Project Structure Notes

- Primary touch points (expected):
  - `app/api/admin/categories/route.ts`
  - `app/api/admin/categories/[id]/route.ts`
  - `app/api/admin/categories/reorder/route.ts`
  - `app/api/admin/product-attributes/route.ts`
  - `app/api/admin/product-attributes/[id]/route.ts`
  - `services/admin/categories.service.ts`
  - `hooks/admin/use-categories.ts`
  - `services/admin/product-attributes.service.ts`
  - `hooks/admin/use-product-attributes.ts`
  - `app/admin/categories/page.tsx`
  - `app/admin/product-attributes/page.tsx`
  - `tests/**` (admin categories/attributes + public compatibility tests)

- Anti-reinvention guidance:
  - Reuse existing admin category/attribute routes and hooks; do not create parallel v2 endpoints.
  - Keep public category/filter behavior routed through existing `/api/public/*` surfaces.
  - Reuse existing slug helpers (`lib/slug.ts`, `lib/product-attributes.ts`) instead of adding duplicate normalization logic.

### Testing Requirements

- Verify admin authorization behavior for all category and product-attribute mutation routes.
- Verify create/update payload validation and uniqueness checks for category slug, attribute slug/code, and attribute value slug/value.
- Verify hierarchy mutation blocks invalid parent cycles and preserves deterministic tree ordering.
- Verify reorder endpoint rejects malformed payloads and persists valid updates transactionally.
- Verify public category/filter responses remain contract-safe and reflect taxonomy changes.
- Verify admin hooks/services continue to parse responses and invalidate query keys correctly after mutations.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.2)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR28, FR32, FR40, NFR6, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (RBAC on `/api/admin/*`, response envelope consistency, route->service->domain layering)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Existing category APIs: `app/api/admin/categories/route.ts`, `app/api/admin/categories/[id]/route.ts`, `app/api/admin/categories/reorder/route.ts`
- Existing attribute APIs: `app/api/admin/product-attributes/route.ts`, `app/api/admin/product-attributes/[id]/route.ts`
- Existing admin client layer: `services/admin/categories.service.ts`, `hooks/admin/use-categories.ts`, `services/admin/product-attributes.service.ts`, `hooks/admin/use-product-attributes.ts`
- Existing admin pages: `app/admin/categories/page.tsx`, `app/admin/product-attributes/page.tsx`
- Previous story context: `_bmad-output/implementation-artifacts/6-1-product-and-variant-crud.md`
- Data model constraints: `prisma/schema.prisma` (`Category`, `ProductAttribute`, `ProductAttributeValue`, `ProductAttributeAssignment`, `ProductCategory`)
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma transactions docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Hardened admin category handlers with explicit auth, payload normalization, cycle prevention, and root-only reorder validation.
- Refactored category detail/update/delete flow with handler/deps pattern for deterministic route-level tests.
- Hardened product-attribute create/update validation for typed payloads, duplicate prevention, and safe value synchronization.
- Added route-level node tests for categories and product-attributes handlers.
- Validation commands:
  - `npx tsx --test tests/admin/admin-categories-routes.test.ts tests/admin/admin-product-attributes-routes.test.ts`
  - `npm run test:node`
  - `npm run lint` (passes with one pre-existing unrelated warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Enforced admin authorization consistently for category admin endpoints and preserved public taxonomy reads on `/api/public/*`.
- Added stricter validation for category create/update/reorder payloads, including parent existence, cycle prevention, duplicate reorder IDs, and root-only reorder scope.
- Added child-category guard on delete and descendant level re-sync when category parent changes.
- Added strict product-attribute payload normalization (type, slug/code, values, displayOrder) with duplicate detection for slugs/values.
- Replaced destructive attribute-value overwrite with safe sync logic to prevent deleting values currently assigned to products.
- Added focused route-level tests for categories and product-attributes integrity/auth behavior.

### File List

- _bmad-output/implementation-artifacts/6-2-category-hierarchy-and-attribute-metadata-management.md
- app/api/admin/categories/route.ts
- app/api/admin/categories/[id]/route.ts
- app/api/admin/categories/reorder/route.ts
- app/api/admin/product-attributes/route.ts
- app/api/admin/product-attributes/[id]/route.ts
- tests/admin/admin-categories-routes.test.ts
- tests/admin/admin-product-attributes-routes.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-04-09: Created Story 6.2 context file with category hierarchy and product-attribute metadata implementation guardrails.
- 2026-04-09: Implemented Story 6.2 route hardening for categories and product-attributes with route-level regression tests; status moved to `review`.
- 2026-04-09: Resolved CR findings for Story 6.2 (strict boolean validation, cycle-safe traversal, deterministic reorder validation, fresh post-update reads, and regression tests); status moved to `done`.

## Story Context Status

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story implementation completed and status set to `done`.
