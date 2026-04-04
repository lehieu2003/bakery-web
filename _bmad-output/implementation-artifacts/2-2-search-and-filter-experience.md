# Story 2.2: Search and Filter Experience

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to search and filter products,
so that I can narrow choices quickly.

## Acceptance Criteria

1. Given I am on a product listing view, when I enter keywords and apply filters, then results update with relevant products and preserved filter state.
2. Given search and filter interactions are used repeatedly, when users change inputs, then interactions remain responsive without blocking UI on supported browsers.
3. Given product search/filter APIs are called, when responses are returned, then payloads follow standardized `{ success, data?, error? }` contract.
4. Given backend contract changes for search/filter behavior, when story is completed, then frontend service/hook/UI call sites are updated in the same story (or explicitly deferred).

## Tasks / Subtasks

- [x] Harden public search/filter API behavior (AC: 1, 3)
- [x] Confirm and preserve `app/api/public/products/route.ts` filter semantics for `search`, `minPrice`, `maxPrice`, `inStock`, `attribute`, `categoryId`, `page`, `limit`.
- [x] Validate category descendant filtering + attribute filter composition remains deterministic under combined filters.
- [x] Keep envelope and status handling consistent with existing API conventions (`success/data/error`).

- [x] Align service and hook contracts for search/filter state (AC: 1, 3, 4)
- [x] Ensure `services/product.service.ts` query serialization fully represents active listing state and avoids ambiguous/empty filter params.
- [x] Ensure `hooks/use-products.ts` query keys encode search/filter params for deterministic cache behavior and correct refetching.
- [x] Update `types/api.types.ts` only if contract additions are required.

- [x] Implement preserved filter state UX across listing/search surfaces (AC: 1, 2, 4)
- [x] Extend `components/screens/CategoryScreen.tsx` to persist/share active filter state through URL query params (or document intentional local-state scope if retained).
- [x] Extend `components/screens/SearchScreen.tsx` to support filter controls and state preservation alongside keyword search.
- [x] Keep responsive parity between desktop and mobile controls, including reset behavior and pagination reset on filter changes.

- [x] Add tests and validations for search/filter correctness and responsiveness assumptions (AC: 1, 2, 3, 4)
- [x] Extend `tests/products/public-products-route.test.ts` for combined keyword + range + in-stock + attribute + category scenarios.
- [x] Extend `tests/products/product-service.test.ts` for stable query serialization and filter-state round-tripping.
- [x] Add/extend UI-oriented tests for query-param sync, filter persistence, reset behavior, and empty/no-result states.

## Dev Notes

- Epic context:
- Story 2.2 builds directly on Story 2.1 and should reuse existing listing/filter primitives rather than introducing parallel search/filter pipelines.

- Architecture guardrails:
- Preserve layer boundaries: UI -> hooks -> services -> API routes -> Prisma/domain utils.
- No direct DB access from components/hooks.
- Preserve standardized response envelope and backward-compatible contracts.
- Keep deterministic query invalidation/cache-key behavior for read surfaces.

- Existing implementation intelligence from Story 2.1:
- Public products endpoint already supports pagination + category + attribute-based filtering with test coverage in `tests/products/public-products-route.test.ts`.
- `CategoryScreen` already resets page when sub-category/filters change; preserve this behavior to avoid stale-page empty results.
- `productService.buildProductQueryParams` already serializes listing filters; extend carefully to avoid breaking existing callers.

- Git intelligence summary (recent commits):
- `feat(stories): complete 1.4 and 2.1 with review fixes` confirms current listing flow and tests are recently stabilized.
- Prior auth/order fixes indicate active cross-domain changes; keep search/filter modifications isolated to discovery surfaces and shared product contracts.

### Project Structure Notes

- Primary touch points:
- `app/api/public/products/route.ts`
- `services/product.service.ts`
- `hooks/use-products.ts`
- `components/screens/CategoryScreen.tsx`
- `components/screens/SearchScreen.tsx`
- `types/api.types.ts`
- `tests/products/public-products-route.test.ts`
- `tests/products/product-service.test.ts`
- `tests/**` (UI/integration tests for search-filter state behavior)

### Testing Requirements

- Route-level:
- Combined filter logic returns deterministic result set and pagination envelope.
- Error paths preserve `{ success: false, error }` shape.

- Service/hook:
- Query serialization includes all active filters and excludes empty values.
- Query key stability prevents stale data and unnecessary refetch churn.

- UI behavior:
- Search/filter state is preserved across navigation/refresh per chosen URL strategy.
- Pagination resets to first page whenever keyword/filter set changes.
- Empty and invalid filter combinations present clear non-blocking UX.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-22-Search-and-Filter-Experience]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Product-Discovery--Content-Browsing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/2-1-category-browsing-and-product-listing.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story selected from user input: `2-2-search-and-filter-experience`.
- Loaded and analyzed epics, architecture, project-context, prior story `2-1`, and recent git history for implementation guardrails.
- Updated sprint status entry for `2-2-search-and-filter-experience` to `ready-for-dev`.
- Updated sprint status entry for `2-2-search-and-filter-experience` to `in-progress`.
- Implemented URL-backed filter state utilities and wired category/search screens to preserve query/filter state across refresh/navigation.
- Executed validation commands:
  - `npx tsx --test tests/products/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts`
  - `npm run lint` (passes with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Implemented URL-based state persistence for listing/search filters (`q`, `minPrice`, `maxPrice`, `inStock`, `attribute`, `subCategory`, `page`) to preserve state across refresh/navigation.
- Added keyword search support to category listing flow and integrated it with existing API contract.
- Extended search screen with filter controls (price range, in-stock toggle, attribute filters) with desktop/mobile parity.
- Added deterministic parse/build utilities for search/filter URL state and covered them with dedicated tests.
- Expanded route/service tests for combined filter composition and query serialization edge cases.
- Completed full project test sweep (`tests/**/*.test.ts`) with all tests passing.

### File List

- _bmad-output/implementation-artifacts/2-2-search-and-filter-experience.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- components/screens/CategoryScreen.tsx
- components/screens/SearchScreen.tsx
- lib/search-filter-state.ts
- tests/products/public-products-route.test.ts
- tests/products/product-service.test.ts
- tests/products/search-filter-state.test.ts

## Change Log

- 2026-04-04: Implemented Story 2.2 search/filter experience with URL state persistence, category/search screen filter UX, and expanded route/service/state tests.
