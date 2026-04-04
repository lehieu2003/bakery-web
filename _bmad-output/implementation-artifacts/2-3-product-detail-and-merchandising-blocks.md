# Story 2.3: Product Detail and Merchandising Blocks

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to view detailed product information with recommendations,
so that I can make purchase decisions confidently.

## Acceptance Criteria

1. Given I open a product detail page, when the page loads, then it displays images, variants, price, and essential product details.
2. Given merchandising zones are rendered on product detail, when the page is viewed, then related/recommended and featured or best-seller blocks are shown with trackable impressions.
3. Given product detail/merch APIs are called, when responses are returned, then payloads follow standardized `{ success, data?, error? }` contract.
4. Given backend contract changes for detail/recommendation behavior, when story is completed, then frontend service/hook/UI call sites are updated in the same story (or explicitly deferred).

## Tasks / Subtasks

- [x] Harden product detail and related API behavior (AC: 1, 2, 3)
- [x] Confirm and preserve `app/api/public/products/[id]/route.ts` semantics for id-or-slug lookup, active visibility, and detail payload completeness.
- [x] Confirm and preserve `app/api/public/products/[id]/related/route.ts` semantics for category-based related recommendations and deterministic ordering.
- [x] Validate `app/api/public/products/best-sellers/route.ts` behavior for best-seller ranking and fallback path.
- [x] Keep response envelope and status handling consistent with existing API conventions (`success/data/error`).

- [x] Implement/complete trackable merchandising impressions (AC: 2, 3, 4)
- [x] Implement public impression tracking endpoint contract (`app/api/public/merch-impressions/route.ts`) with safe validation and non-blocking behavior.
- [x] Ensure related and best-seller cards emit impression events once per card visibility context.
- [x] Ensure impression tracking failures never block or degrade the product-detail experience.

- [x] Align service/hook/UI contracts for detail and merchandising blocks (AC: 1, 2, 4)
- [x] Ensure `services/product.service.ts` and `hooks/use-products.ts` remain contract-aligned for detail, related, and best-seller surfaces.
- [x] Ensure `components/screens/ProductDetailScreen.tsx` renders essential detail content (gallery, variants, price, core description) with resilient loading/error states.
- [x] Ensure `components/screens/RelatedProducts.tsx` and `components/screens/BestSellersSection.tsx` render merchandising blocks consistently on product detail.

- [x] Add tests and validations for detail and merchandising behavior (AC: 1, 2, 3, 4)
- [x] Add/extend route tests for impression payload validation and response envelope.
- [x] Add/extend tests for related/best-seller API contract invariants and fallback behavior.
- [x] Validate no regressions in existing products test suite and lint gates.

## Dev Notes

- Epic context:
- Story 2.3 builds on discovery foundations from 2.1 and 2.2, and should reuse existing product detail/recommendation primitives instead of creating duplicate pipelines.

- Architecture guardrails:
- Preserve layer boundaries: UI -> hooks -> services -> API routes -> Prisma/domain utils.
- No direct DB access from components/hooks.
- Preserve standardized response envelope and backward-compatible contracts.
- Keep read-surface behavior resilient; analytics/impression failures must be non-blocking.

- Previous story intelligence (2.2):
- URL/state synchronization patterns and deterministic query behavior were stabilized in 2.2 and should not be regressed.
- 2.2 enforced explicit backend-frontend sync rules; apply the same discipline for detail/recommendation contract updates.
- Product-discovery tests are active and should be extended rather than replaced.

- Current branch intelligence:
- Working tree already contains early 2.3-oriented changes around merchandising impressions and detail merchandising blocks.
- Dev-story should reconcile these in-flight changes against this story checklist and acceptance criteria before marking completion.

### Project Structure Notes

- Primary touch points:
- `app/(web)/products/[id]/page.tsx`
- `components/screens/ProductDetailScreen.tsx`
- `components/screens/RelatedProducts.tsx`
- `components/screens/BestSellersSection.tsx`
- `app/api/public/products/[id]/route.ts`
- `app/api/public/products/[id]/related/route.ts`
- `app/api/public/products/best-sellers/route.ts`
- `app/api/public/merch-impressions/route.ts`
- `lib/merch-impressions.ts`
- `services/product.service.ts`
- `hooks/use-products.ts`
- `tests/products/*`

### Testing Requirements

- Route-level:
- Impression endpoint validates payload shape and returns stable envelope for success/error.
- Detail/recommendation routes preserve stable envelope and deterministic data shape.

- Integration/behavior:
- Merchandising cards emit impression tracking in a non-blocking manner.
- Product detail still renders essential information and merchandising zones under normal/empty/error states.

- Regression:
- Run product-focused test suite and full test sweep as needed for confidence.
- Run lint and ensure no new warnings/errors introduced by 2.3 changes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-23-Product-Detail-and-Merchandising-Blocks]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Product-Discovery--Content-Browsing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/2-2-search-and-filter-experience.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented client impression tracker (`lib/merch-impressions.ts`) with per-card dedupe and non-blocking fire-and-forget call path.
- Added public impression API route (`app/api/public/merch-impressions/route.ts`) with payload validation and standardized response envelope.
- Extended merchandising surfaces: related and best-seller cards now emit one-time impression events on visibility, and product detail now renders best-seller block.
- Refactored related and best-sellers routes to injectable handler functions for testability while preserving API response semantics.
- Added/extended route tests for impression validation, related-product invariants, and best-seller ranking/fallback behavior.
- Validation runs completed: `npx tsx --test tests/products/*.test.ts`, `npx tsx --test tests/**/*.test.ts`, and `npm run lint` (with one pre-existing warning in `app/api/public/products/filters/route.ts`).

### Completion Notes List

- Story 2.3 implementation completed and moved to review.
- Merchandising impression tracking is now available across product detail related and best-seller zones with non-blocking behavior.
- API contract invariants for related and best-seller endpoints are covered by route tests.
- Product-focused and full test suites pass; lint passes with one pre-existing warning outside 2.3 scope.

### File List

- _bmad-output/implementation-artifacts/2-3-product-detail-and-merchandising-blocks.md
- app/api/public/merch-impressions/route.ts
- app/api/public/products/[id]/related/route.ts
- app/api/public/products/best-sellers/route.ts
- components/screens/BestSellersSection.tsx
- components/screens/ProductDetailScreen.tsx
- components/screens/RelatedProducts.tsx
- lib/merch-impressions.ts
- tests/products/best-sellers-route.test.ts
- tests/products/merch-impressions-route.test.ts
- tests/products/public-product-related-route.test.ts
