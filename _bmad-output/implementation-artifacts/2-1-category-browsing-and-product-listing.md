# Story 2.1: Category Browsing and Product Listing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to browse product categories,
so that I can explore available bakery products by intent.

## Acceptance Criteria

1. Given product categories exist in admin-managed hierarchy, when I navigate a category page, then I see paginated products for that category with key card information.
2. Given category browsing routes are rendered, when users or crawlers open key routes, then rendering meets SEO and performance targets for storefront pages.
3. Given category/product listing APIs are called, when responses are returned, then payloads follow standardized `{ success, data?, error? }` contract.
4. Given backend contract changes for category browsing/listing, when story is completed, then frontend service/hook/UI call sites are updated in the same story (or explicitly deferred).

## Tasks / Subtasks

- [x] Implement category browsing API/listing behavior (AC: 1, 3)
- [x] Validate and reuse existing `app/api/public/categories/route.ts` + `app/api/public/products/route.ts` contracts before adding any new endpoint.
- [x] Ensure category-scoped product query supports pagination and stable sorting for deterministic UX.
- [x] Keep response envelope consistent (`success/data/error`) and safe error handling.

- [x] Implement storefront category listing UI flow (AC: 1, 2, 4)
- [x] Update `app/(web)/categories/[...slug]/page.tsx` + related screen components to fetch category context and paginated products.
- [x] Ensure product cards include key info (image, name, price, availability cues).
- [x] Handle empty category and invalid slug states with clear UX.

- [x] Align service/hook contracts with API (AC: 1, 3, 4)
- [x] Update `services/product.service.ts` and relevant hooks to consume/emit category listing params and response types.
- [x] Update `types/api.types.ts` only when contract additions are required.

- [x] Add tests and validations (AC: 1, 2, 3, 4)
- [x] Add route/service tests for category listing pagination and envelope shape.
- [x] Add UI-level tests (or focused integration tests) for category slug resolution and empty/error states.

### Review Findings

- [x] [Review][Patch] Category pagination page is not reset when sub-category/filters change, causing false empty results on stale page index [components/screens/CategoryScreen.tsx:50]

## Dev Notes

- Epic context:
- Epic 2 starts discovery/content browsing. Story 2.1 is foundational for search/filter/detail flows.

- Architecture guardrails:
- Keep boundaries: UI -> hooks -> services -> API routes -> Prisma/domain utils.
- No direct DB calls in hooks/components.
- Keep response contract stable and backward-compatible.

- Existing implementation hints:
- Routes already present for `public/categories` and `public/products`; prioritize extension/refinement over new endpoints.
- Category route path exists: `app/(web)/categories/[...slug]/page.tsx`.

### Project Structure Notes

- Expected touch points:
- `app/(web)/categories/[...slug]/page.tsx`
- `components/screens/*` category/listing-related components
- `app/api/public/categories/route.ts`
- `app/api/public/products/route.ts`
- `services/product.service.ts`
- `hooks/*` product/category hooks
- `types/api.types.ts`
- `tests/*`

### Testing Requirements

- Validate pagination behavior and query-param handling for category listing.
- Validate envelope shape for success/failure paths.
- Validate category page UX for normal, empty, and invalid category cases.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-21-Category-Browsing-and-Product-Listing]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Product-Discovery--Content-Browsing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first backlog story from sprint status: `2-1-category-browsing-and-product-listing`.
- Marked `epic-2` as `in-progress` and this story as `ready-for-dev`.
- Story moved to `in-progress` in sprint tracking before implementation.
- Added route handler abstraction `handleGetPublicProductsRequest` with injectable deps for category+paging contract tests.
- Updated category browsing UI to:
  - use API pagination params (`page`, `limit`),
  - query by effective category id (current category or selected sub-category),
  - avoid fallback-to-all-products when slug path is invalid,
  - render explicit invalid-category UX.
- Validation commands executed:
  - `npx tsx --test tests/products/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts`
  - `npm run lint` (passes with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Story context prepared for immediate `dev-story` execution.
- Implemented category-scoped products handler with normalized pagination defaults and capped limit for deterministic browsing.
- Preserved public products API envelope contract `{ success, data?, error? }`.
- Implemented category page safeguards to prevent invalid slug paths from showing unrelated product listings.
- Added pagination controls to category listing UI for page-by-page navigation.
- Added route-level tests for category descendant filtering and pagination envelope.
- Added service-level query-param tests for category/pagination/filter wiring.
- Added category-path utility tests to validate slug path resolution and canonical href generation.
- ✅ Resolved review finding [Medium]: category page now resets to page 1 whenever sub-category or filters change to avoid false empty-state results.

### File List

- app/api/public/products/route.ts
- components/screens/CategoryScreen.tsx
- services/product.service.ts
- tests/products/public-products-route.test.ts
- tests/products/product-service.test.ts
- tests/products/category-path.test.ts
- _bmad-output/implementation-artifacts/2-1-category-browsing-and-product-listing.md

## Change Log

- 2026-04-04: Implemented Story 2.1 category browsing and product listing (API pagination hardening, category page pagination + invalid-slug UX, and route/service/category-path tests).
- 2026-04-04: Addressed code review findings - 1 items resolved.
