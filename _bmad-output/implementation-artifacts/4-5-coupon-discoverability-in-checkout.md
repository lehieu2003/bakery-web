# Story 4.5: Coupon Discoverability in Checkout

Status: review

## Story

As a customer,
I want to see available incentive codes in checkout,
so that I can apply valid promotions without relying on external channels.

## Acceptance Criteria

1. Given active incentives exist, when I open checkout, then the system shows a discoverable "Available offers" list with code and core conditions.
2. Given I select an offer from the list, when I tap apply, then the selected code is inserted into incentive input for server-side validation on order submit.
3. Given no eligible offers exist, when checkout loads, then the system shows an explicit empty state instead of hiding the feature.
4. Given offer data is shown on UI, when totals are displayed, then client does not become pricing authority and final pricing remains server-authoritative.

## Tasks / Subtasks

- [x] Add read API for discoverable incentives (AC: 1, 3)
- [x] Implement `GET /api/incentives/available` route with envelope `{ success, data?, error? }`.
- [x] Filter by active flag/time window and remaining usage (`usageLimit` is null or > 0).
- [x] Return only fields needed for checkout discoverability (`code`, `type`, `value`, `minOrder`, `maxDiscount`, `endAt`).
- [x] Keep route safe for guest and logged-in checkout contexts.

- [x] Add frontend service + hook for incentive discoverability (AC: 1, 3)
- [x] Create service contract and typed response model for available incentives.
- [x] Add React Query hook with resilient loading/error/empty states.

- [x] Integrate discoverability UI in checkout payment screen (AC: 1, 2, 3, 4)
- [x] Render "Available offers" section near incentive input.
- [x] Add apply action that fills incentive input with selected code.
- [x] Keep accessibility messaging perceivable (`aria-live`) for apply/empty/error states.
- [x] Ensure UI wording makes final pricing authority explicit (server validates final amount).

- [x] Add regression coverage (AC: 1, 2, 3, 4)
- [x] Add route-level tests for filtering/shape/empty behavior.
- [x] Add service tests for response mapping and error handling.
- [x] Add UI tests for offer rendering, apply action, and empty state messaging.

## Dev Notes

- Scope boundaries:
- In scope: discoverability and apply-assist UX for incentive code entry in checkout.
- Out of scope: recommendation ranking, campaign orchestration, auto-apply optimization across multiple incentives.

- Architecture guardrails:
- Preserve route -> service -> hook -> screen layering.
- Keep final discount and total validation in `POST /api/orders` only.
- Avoid duplicate discount math in client; discoverability is assistive, not authoritative pricing logic.

- Data and behavior constraints:
- Offer list is informational and eligibility can still fail at submit due to real-time rule changes.
- Messaging should clearly indicate server will validate final eligibility and price.

### Project Structure Notes

- Primary touch points:
- `app/api/incentives/available/route.ts`
- `components/screens/CheckoutPaymentScreen.tsx`
- `services/incentive-discovery.service.ts`
- `hooks/use-available-incentives.ts`
- `tests/orders/*` and `tests/vitest/*`

### Testing Requirements

- Verify route filters and response envelope stability.
- Verify UI apply interaction fills code input correctly.
- Verify empty-state and accessibility messaging are present.
- Verify no client-side authoritative pricing logic is introduced.

## Story Context Status

- Story added after 4.2 review to address missing coupon discoverability path.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented new discoverability route `GET /api/incentives/available` with deterministic filtering by active window, usage availability, and optional subtotal threshold.
- Added incentive discovery service and React Query hook.
- Integrated checkout payment UI to show available offers, apply offer code into input, and expose loading/error/empty/apply messaging with `aria-live` support.
- Added Node test coverage for route filtering + service request mapping.
- Extended checkout Vitest suite with offer rendering/apply/empty-state assertions.
- Validation commands executed:
  - `npx tsx --test tests/orders/order-service.test.ts tests/orders/orders-route.test.ts tests/orders/incentive-discovery-service.test.ts tests/orders/incentives-available-route.test.ts` (pass)
  - `npx tsc --noEmit -p tsconfig.json` (pass)
  - `npm run lint` (pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Added a discoverability API for checkout incentives with envelope consistency and safe guest usage.
- Added frontend data layer and hook for incentive offers scoped to checkout subtotal context.
- Added checkout UI affordance to discover and apply available incentive codes without introducing client-side pricing authority.
- Added regression tests for route/service and updated UI tests for discoverability interactions.

### File List

- _bmad-output/implementation-artifacts/4-5-coupon-discoverability-in-checkout.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/incentives/available/route.ts
- components/screens/CheckoutPaymentScreen.tsx
- hooks/index.ts
- hooks/use-available-incentives.ts
- lib/api/endpoints.ts
- services/index.ts
- services/incentive-discovery.service.ts
- tests/orders/incentive-discovery-service.test.ts
- tests/orders/incentives-available-route.test.ts
- tests/vitest/membership-benefit-visibility.test.tsx

## Change Log

- 2026-04-06: Created Story 4.5 to address coupon discoverability gap after Story 4.2.
- 2026-04-06: Implemented Story 4.5 discoverability API, checkout integration, and regression coverage.
