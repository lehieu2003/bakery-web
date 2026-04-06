# Story 4.3: Quick Reorder from Prior Purchases

Status: ready-for-dev

## Story

As a returning customer,
I want to reorder from purchase history,
so that I can complete repeat purchases quickly.

## Acceptance Criteria

1. Given I have previous completed orders, when I choose reorder on a past order, then the system pre-populates a new cart with available items and variant mapping.
2. Given some past items are unavailable, when reorder is prepared, then unavailable items are flagged with substitute guidance instead of silent failure.

## Tasks / Subtasks

- [ ] Add reorder action in order-history surface (AC: 1, 2)
- [ ] Expose a reorder trigger on completed orders only.
- [ ] Preserve existing order-history behaviors and status display.

- [ ] Implement server-side reorder preparation flow (AC: 1, 2)
- [ ] Add route contract to build reorder payload from a past order id.
- [ ] Resolve product/variant availability at preparation time and return structured result.
- [ ] Keep API envelope stable (`{ success, data?, error? }`) with actionable failure messages.

- [ ] Integrate reorder result into cart state (AC: 1, 2)
- [ ] Pre-populate cart with available mapped items.
- [ ] Show explicit unavailable-item guidance with non-blocking UX.
- [ ] Keep checkout totals server-authoritative and avoid duplicating pricing logic.

- [ ] Add regression coverage (AC: 1, 2)
- [ ] Add route-level tests for success and partial-unavailable scenarios.
- [ ] Add cart/order-history integration tests for reorder population behavior.
- [ ] Add UI tests for unavailable guidance visibility and accessibility messaging.

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
