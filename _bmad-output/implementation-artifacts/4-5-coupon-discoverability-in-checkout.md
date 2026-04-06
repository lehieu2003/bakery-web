# Story 4.5: Coupon Discoverability in Checkout

Status: ready-for-dev

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

- [ ] Add read API for discoverable incentives (AC: 1, 3)
- [ ] Implement `GET /api/incentives/available` route with envelope `{ success, data?, error? }`.
- [ ] Filter by active flag/time window and remaining usage (`usageLimit` is null or > 0).
- [ ] Return only fields needed for checkout discoverability (`code`, `type`, `value`, `minOrder`, `maxDiscount`, `endAt`).
- [ ] Keep route safe for guest and logged-in checkout contexts.

- [ ] Add frontend service + hook for incentive discoverability (AC: 1, 3)
- [ ] Create service contract and typed response model for available incentives.
- [ ] Add React Query hook with resilient loading/error/empty states.

- [ ] Integrate discoverability UI in checkout payment screen (AC: 1, 2, 3, 4)
- [ ] Render "Available offers" section near incentive input.
- [ ] Add apply action that fills incentive input with selected code.
- [ ] Keep accessibility messaging perceivable (`aria-live`) for apply/empty/error states.
- [ ] Ensure UI wording makes final pricing authority explicit (server validates final amount).

- [ ] Add regression coverage (AC: 1, 2, 3, 4)
- [ ] Add route-level tests for filtering/shape/empty behavior.
- [ ] Add service tests for response mapping and error handling.
- [ ] Add UI tests for offer rendering, apply action, and empty state messaging.

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
