# Story 4.3: Quick Reorder from Prior Purchases

Status: done

## Story

As a returning customer,
I want to reorder from purchase history,
so that I can complete repeat purchases quickly.

## Acceptance Criteria

1. Given I have previous completed orders, when I choose reorder on a past order, then the system pre-populates a new cart with available items and variant mapping.
2. Given some past items are unavailable, when reorder is prepared, then unavailable items are flagged with substitute guidance instead of silent failure.

## Tasks / Subtasks

- [x] Add reorder action in order-history surface (AC: 1, 2)
- [x] Expose a reorder trigger on completed orders only.
- [x] Preserve existing order-history behaviors and status display.

- [x] Implement server-side reorder preparation flow (AC: 1, 2)
- [x] Add route contract to build reorder payload from a past order id.
- [x] Resolve product/variant availability at preparation time and return structured result.
- [x] Keep API envelope stable (`{ success, data?, error? }`) with actionable failure messages.

- [x] Integrate reorder result into cart state (AC: 1, 2)
- [x] Pre-populate cart with available mapped items.
- [x] Show explicit unavailable-item guidance with non-blocking UX.
- [x] Keep checkout totals server-authoritative and avoid duplicating pricing logic.

- [x] Add regression coverage (AC: 1, 2)
- [x] Add route-level tests for success and partial-unavailable scenarios.
- [x] Add cart/order-history integration tests for reorder population behavior.
- [x] Add UI tests for unavailable guidance visibility and accessibility messaging.

## Dev Notes

- Scope boundaries:
- In scope: reorder preparation and cart prefill from prior purchases.
- Out of scope: personalized ranking and recommendation model logic (Story 4.4).

- Architecture guardrails:
- Preserve route -> service -> hook -> screen layering.
- Keep reorder eligibility checks on server.
- Keep existing cart/order flow invariants intact.

### Project Structure Notes

- Primary touch points:
- `app/api/orders/**`
- `components/screens/ProfileOrders*` (or existing order-history surfaces)
- `lib/cart-store.tsx`
- `services/order.service.ts`
- `tests/orders/*`
- `tests/vitest/*`

### Testing Requirements

- Verify reorder route returns deterministic mapping for available items.
- Verify unavailable products/variants are surfaced explicitly.
- Verify cart is prefilled with only valid items and no silent failures.

## Story Context Status

- Story prepared from Epic 4 sequencing after Story 4.2/4.5 checkout incentive work.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- DS invoked for Story `4-3-quick-reorder-from-prior-purchases`.
- Added `POST /api/orders/reorder` handler with ownership check, completed-order eligibility validation, grouped item preparation, variant/product availability checks, and structured unavailable guidance.
- Added reorder contract to service + hook layer (`orderService.prepareReorder`, `usePrepareReorder`) and endpoint constant (`ENDPOINTS.ORDERS_REORDER`).
- Added cart replace capability (`replaceCart`) to support deterministic cart prefill from reorder preparation results.
- Updated `ProfileScreen` order history to expose reorder only for `COMPLETED` orders, call reorder mutation, prefill cart, and surface non-blocking unavailable guidance in an `aria-live='polite'` region.
- Added route-level, service-level, and UI-level regression tests for reorder preparation and guidance behavior.
- Validation commands executed:
  - `npx tsc --noEmit -p tsconfig.json` (pass)
  - `npx tsx --test tests/orders/order-service.test.ts tests/orders/orders-route.test.ts tests/orders/incentive-discovery-service.test.ts tests/orders/incentives-available-route.test.ts tests/orders/orders-reorder-route.test.ts` (pass)
  - `npx vitest run tests/vitest/membership-benefit-visibility.test.tsx tests/vitest/reorder-order-history.test.tsx` (blocked by pre-existing environment issue: `ERR_REQUIRE_ASYNC_MODULE` in jsdom worker startup)
  - `npm run lint` (pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Implemented server-authoritative reorder preparation for prior completed orders with stable API envelope and actionable failure messaging.
- Implemented availability resolution for product and variant paths, including partial-stock handling with explicit unavailable guidance instead of silent drops.
- Prefilled cart from prepared reorder items via a dedicated cart replacement operation and kept checkout pricing authority on server-side order APIs.
- Added completed-order-only reorder trigger in order history while preserving existing order status and payment status display patterns.
- Added regression coverage across route, service, and order-history UI integration paths for reorder behavior and accessibility messaging.

### File List

- _bmad-output/implementation-artifacts/4-3-quick-reorder-from-prior-purchases.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/orders/reorder/route.ts
- components/screens/ProfileScreen.tsx
- hooks/index.ts
- hooks/use-orders.ts
- lib/api/endpoints.ts
- lib/cart-store.tsx
- services/order.service.ts
- tests/orders/order-service.test.ts
- tests/orders/orders-reorder-route.test.ts
- tests/vitest/membership-benefit-visibility.test.tsx
- tests/vitest/reorder-order-history.test.tsx

## Change Log

- 2026-04-06: Implemented Story 4.3 quick reorder flow across order API, service/hook layers, cart integration, and order-history UI.
- 2026-04-06: Added regression coverage for reorder route/service and order-history integration behavior.
- 2026-04-06: Updated Story 4.3 status to `review` with completion notes, file list, and validation evidence.
- 2026-04-06: Code review passed and story status moved to `done`.
