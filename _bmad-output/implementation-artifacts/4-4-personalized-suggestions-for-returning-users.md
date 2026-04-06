# Story 4.4: Personalized Suggestions for Returning Users

Status: done

## Story

As a returning customer,
I want recommendations based on prior behavior,
so that I can discover relevant products faster.

## Acceptance Criteria

1. Given I have historical purchase or browsing behavior, when I return to storefront surfaces, then personalized suggestion blocks are rendered from defined recommendation logic.
2. Given behavior data is insufficient, when recommendations are requested, then results degrade gracefully to generic featured items.

## Tasks / Subtasks

- [x] Add personalized recommendation read API (AC: 1, 2)
- [x] Implement `GET /api/public/products/personalized` with envelope `{ success, data?, error? }`.
- [x] Resolve current user via `getCurrentUserFromRequest`; do not fail request when user is missing, return fallback recommendations instead.
- [x] Define deterministic ranking logic from available behavior signals:
- [x] Primary signal: completed order history (`OrderItem` joined through user orders).
- [x] Secondary signal: wishlist history as browsing-intent proxy.
- [x] Use deterministic score ordering (frequency + recency tie-break rules) so results are reproducible in tests.
- [x] Return active products only, serialize numeric/date fields consistently with existing public product APIs.
- [x] If ranked behavioral candidates are insufficient, fill remaining slots from best-seller/featured fallback path (no empty block unless catalog is truly empty).
- [x] Return recommendation source metadata for UI messaging:
- [x] `source = behavioral | hybrid | fallback`
- [x] `reason = no-user | no-signal | insufficient-signal | behavior-match`

- [x] Add service + hook integration for storefront consumption (AC: 1, 2)
- [x] Add endpoint constant in `lib/api/endpoints.ts`.
- [x] Add `services/personalized-recommendation.service.ts` with typed response contract.
- [x] Add `hooks/use-personalized-recommendations.ts` using React Query key conventions and bounded stale time.
- [x] Re-export new hook/service through existing index barrels as needed.

- [x] Render personalized suggestion block on storefront (AC: 1, 2)
- [x] Add `components/screens/PersonalizedSuggestionsSection.tsx` using existing card/section style patterns from merchandising surfaces.
- [x] Integrate section into `HomeScreen` on return-visit flow.
- [x] Keep clear fallback messaging when data comes from generic featured/best-seller fill.
- [x] Preserve accessibility (`aria-labelledby`, `aria-live` for loading/error/fallback messaging).

- [x] Extend merchandising impression tracking for personalized slot (AC: 1)
- [x] Extend `trackMerchImpression` payload slot union to include `personalized`.
- [x] Keep impression failures non-blocking for UX parity.

- [x] Add regression coverage (AC: 1, 2)
- [x] Add route-level tests for behavior-ranked success, hybrid fill, and full-fallback scenarios.
- [x] Add service tests for contract mapping and error handling.
- [x] Add UI tests for section render, fallback messaging, and no-regression behavior when data is empty.

## Dev Notes

- Scope boundaries:
- In scope: deterministic behavior-based product suggestion block for storefront return visits, with graceful fallback.
- Out of scope: ML model training, campaign orchestration, cross-device identity resolution, and persisted browsing-event pipeline.

- Recommendation logic constraints:
- Use only currently available persisted signals (`Order`/`OrderItem`, `Wishlist`) for this story.
- Since dedicated browsing-event persistence is not available in current schema, treat absent persisted behavior as "insufficient data" and fall back deterministically.
- Do not block suggestion rendering when behavior signal is absent; fallback must still return useful products.
- Keep pricing/order authority server-side; recommendation surfaces are discovery-only.

- Architecture guardrails:
- Preserve route -> service -> hook -> screen layering.
- Keep response envelope and error shape consistent with current APIs.
- Reuse existing product card patterns where possible; avoid creating parallel UI systems for the same merch block behavior.

- Dependency/compatibility guardrails:
- Reuse existing best-seller fallback logic rather than duplicating divergent ranking code.
- Ensure new endpoint and hook naming follow current conventions (`*.service.ts`, `use-*.ts` / `use*.ts`, `ENDPOINTS.PUBLIC.*`).

### Project Structure Notes

- Primary touch points:
- `app/api/public/products/personalized/route.ts`
- `services/personalized-recommendation.service.ts`
- `hooks/use-personalized-recommendations.ts`
- `hooks/index.ts`
- `services/index.ts`
- `components/screens/PersonalizedSuggestionsSection.tsx`
- `components/screens/HomeScreen.tsx`
- `lib/api/endpoints.ts`
- `lib/merch-impressions.ts`
- `app/api/public/merch-impressions/route.ts`
- `tests/products/*`
- `tests/vitest/*`

### Testing Requirements

- Verify recommendation route returns behavior-ranked results when user history is available.
- Verify fallback/hybrid behavior always returns usable products when behavior signals are insufficient.
- Verify envelope shape remains stable (`{ success, data?, error? }`) for success/failure paths.
- Verify `source/reason` metadata is correct for behavioral, hybrid, and full-fallback branches.
- Verify storefront renders personalized block and fallback copy without breaking existing best-seller/category sections.
- Verify personalized impression tracking payload accepts the new slot and remains non-blocking on network failures.

### References

- Epic and AC source: `_bmad-output/planning-artifacts/epics.md` (Story 4.4).
- Product requirement source: `_bmad-output/planning-artifacts/prd.md` (FR22, personalization/reorder goals).
- Architecture constraints: `_bmad-output/planning-artifacts/architecture.md` (API envelope, layering, loyalty/reorder mapping).
- Project rules: `_bmad-output/project-context.md` (backend-frontend sync requirements).
- Reuse patterns:
- `app/api/public/products/best-sellers/route.ts`
- `app/api/public/products/[id]/related/route.ts`
- `services/product.service.ts`
- `hooks/use-products.ts`
- `components/screens/BestSellersSection.tsx`
- `components/screens/RelatedProducts.tsx`
- `lib/merch-impressions.ts`
- `app/api/public/merch-impressions/route.ts`

## Story Context Status

- Story prepared after completion of 4.3 and 4.5, with reuse-first guidance and deterministic fallback behavior to minimize implementation risk.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- DS invoked for Story `4-4-personalized-suggestions-for-returning-users`.
- Added `GET /api/public/products/personalized` route with deterministic behavior ranking from completed orders and wishlist signals.
- Implemented graceful fallback composition by reusing best-seller route logic and emitting source metadata (`behavioral`, `hybrid`, `fallback`) with explicit reason codes.
- Added personalized recommendation service + React Query hook and wired endpoint constant in `ENDPOINTS.PUBLIC`.
- Added `PersonalizedSuggestionsSection` to storefront home flow with accessibility-friendly fallback messaging and personalized merch impression tracking.
- Extended merch impression payload validation to accept `slot: personalized` and updated route tests.
- Validation commands executed:
  - `npx tsc --noEmit -p tsconfig.json` (pass)
  - `npx tsx --test tests/products/personalized-products-route.test.ts tests/products/personalized-recommendation-service.test.ts tests/products/merch-impressions-route.test.ts` (pass)
  - `npx vitest run tests/vitest/personalized-suggestions-section.test.tsx` (blocked by pre-existing environment issue: `ERR_REQUIRE_ASYNC_MODULE` in jsdom worker startup)
  - `npm run lint` (pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Implemented deterministic personalized recommendation API using available persisted behavior signals with clear tie-break ordering for test stability.
- Ensured recommendations degrade gracefully through best-seller fallback and surfaced source/reason metadata for accurate UI messaging.
- Added frontend service/hook integration and home-screen personalized block rendering without breaking existing merchandising sections.
- Extended merchandising impression tracking contract to include personalized slots while preserving non-blocking analytics behavior.
- Added regression tests for API branch behavior, service contract mapping, and UI fallback rendering.

### File List

- _bmad-output/implementation-artifacts/4-4-personalized-suggestions-for-returning-users.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/public/merch-impressions/route.ts
- app/api/public/products/personalized/route.ts
- components/screens/HomeScreen.tsx
- components/screens/PersonalizedSuggestionsSection.tsx
- hooks/index.ts
- hooks/use-personalized-recommendations.ts
- lib/api/endpoints.ts
- lib/merch-impressions.ts
- services/index.ts
- services/personalized-recommendation.service.ts
- tests/products/merch-impressions-route.test.ts
- tests/products/personalized-products-route.test.ts
- tests/products/personalized-recommendation-service.test.ts
- tests/vitest/personalized-suggestions-section.test.tsx

## Change Log

- 2026-04-06: Implemented Story 4.4 personalized recommendation route with deterministic behavior scoring and fallback metadata.
- 2026-04-06: Integrated personalized suggestions into HomeScreen with storefront messaging and merch impression tracking.
- 2026-04-06: Added API/service/UI regression coverage for personalized recommendation flow.
- 2026-04-06: Updated Story 4.4 status to `review` with validation evidence.
- 2026-04-06: Code review passed and story status moved to done.

