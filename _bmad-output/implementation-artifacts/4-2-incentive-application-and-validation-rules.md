# Story 4.2: Incentive Application and Validation Rules

Status: done

## Story

As a member,
I want eligible incentives applied correctly,
so that my reorder friction is reduced without pricing errors.

## Acceptance Criteria

1. Given I meet incentive eligibility conditions, when I apply an incentive at checkout, then order totals update correctly and discount rules are enforced server-side.
2. Given conflicting or invalid incentives are submitted, when checkout is evaluated, then the system rejects them with actionable feedback.

## Tasks / Subtasks

- [x] Implement authoritative incentive validation in the order write path (AC: 1, 2)
- [x] Extend `POST /api/orders` payload contract with optional incentive input (`incentiveCode`) and validate shape server-side before pricing (AC: 1, 2)
- [x] Resolve incentive against persisted coupon configuration (`Coupon` model) with checks: active window, min order, usage cap, and discount bounds (AC: 1, 2)
- [x] Keep all discount/incentive math deterministic and server-authoritative; do not trust client-provided totals (AC: 1)

- [x] Define and enforce conflict rules for incentive application (AC: 2)
- [x] Support only one explicit incentive code per order in this story
- [x] Reject unsupported stacking/conflicting incentive attempts with stable actionable messages
- [x] Preserve API envelope consistency (`{ success, data?, error? }`) and existing status mapping

- [x] Wire checkout client flow to server-authoritative incentive outcomes (AC: 1, 2)
- [x] Update service/types for new payload and response fields
- [x] Render applied incentive summary and rejection feedback in checkout surfaces without adding client-side pricing authority
- [x] Ensure status/error messaging remains perceivable by assistive tech (`NFR19`)

- [x] Add regression coverage for pricing integrity and conflict handling (AC: 1, 2)
- [x] Add route-level tests for valid incentive application and invalid/conflicting submissions
- [x] Preserve non-regression coverage for payment routing and order creation invariants
- [x] Add UI-focused tests for incentive feedback rendering and accessibility status messaging

## Dev Notes

- Epic context:
- Story 4.2 builds directly on Story 4.1 and introduces incentive application/validation logic; this must not regress checkout/payment integrity established in Epic 3.

- Scope boundaries:
- In scope: checkout-time incentive validation and total recalculation.
- Out of scope: recommendation ranking (Story 4.4), reorder prefill logic (Story 4.3), campaign automation or cross-channel loyalty orchestration.

- Architecture guardrails:
- Preserve route -> service -> hook -> screen layering.
- Keep API response envelope and stable error mapping.
- Keep payment/order integrity controls intact (idempotent callback behavior and consistent order/payment state transitions).

- Reuse-first implementation guidance:
- Reuse membership discount authority from `lib/membership/rules.ts` and current order total flow in `app/api/orders/route.ts`.
- Use existing `Coupon` persistence model for incentive validation inputs; avoid ad-hoc in-memory rule duplication.
- If incentive persistence on `Order` is introduced, define explicit schema migration and non-breaking serialization.

- Cross-story dependency notes:
- Story 4.3 and 4.4 must consume the same incentive-validation primitives introduced here to avoid drift.

### Project Structure Notes

- Primary touch points:
- `app/api/orders/route.ts`
- `lib/membership/rules.ts`
- `components/screens/CheckoutPaymentScreen.tsx`
- `services/order.service.ts`
- `types/api.types.ts`
- `tests/orders/orders-route.test.ts`

- Likely new touch points:
- `lib/incentives/**` (validation + conflict helper primitives)
- `tests/orders/*incentive*.test.ts`
- `tests/vitest/*incentive*.test.tsx`

### Testing Requirements

- Contract and validation behavior:
- Eligible incentive updates totals correctly and is enforced server-side.
- Invalid/conflicting incentives return actionable, stable error messages.
- Unauthorized/guest behavior remains explicit and safe.

- Pricing and integrity behavior:
- Membership discount + incentive resolution remains deterministic under all tested branches.
- Existing payment method handling and order creation invariants are not regressed.
- Order totals remain non-negative and rounding behavior remains stable.

- UI behavior:
- Checkout surfaces show applied incentive state or rejection feedback from server response.
- UI does not invent pricing logic; displayed totals align with server-authoritative totals.
- Incentive status/error messages are perceivable by screen readers (`NFR19`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-42-Incentive-Application-and-Validation-Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Loyalty-Incentives--Reorder]
- [Source: _bmad-output/planning-artifacts/prd.md#Loyalty-Promotions--Reorder]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/4-1-membership-benefit-visibility-in-purchase-flow.md]

## Story Context Status

- Validation updated: Story 4.2 now contains implementation guardrails, deterministic validation scope, and explicit test obligations for incentive application.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- DS invoked for Story `4-2-incentive-application-and-validation-rules`.
- Implemented backend incentive validation in `POST /api/orders` including code normalization, eligibility windows, usage/min-order constraints, deterministic discount calculation, and membership-vs-incentive conflict rejection.
- Preserved API envelope consistency and payment flow response shape while adding `appliedIncentive` payload data.
- Updated checkout integration to send optional `incentiveCode`, surface actionable server errors, and keep message regions perceivable (`aria-live='polite'`).
- Extended service contract and tests for optional incentive payload and response handling.
- Added/updated route-level tests for valid incentive application and invalid/conflicting scenarios.
- Added UI-focused vitest coverage for incentive input/feedback rendering and accessibility messaging.
- Validation commands executed:
  - `npx tsx --test tests/orders/order-service.test.ts tests/orders/orders-route.test.ts` (pass)
  - `npx tsc --noEmit -p tsconfig.json` (pass)
  - `npm run lint` (pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)
  - `npx vitest run tests/vitest/membership-benefit-visibility.test.tsx` (blocked by existing environment issue: `ERR_REQUIRE_ASYNC_MODULE` in jsdom worker startup)

### Completion Notes List

- Added server-authoritative incentive handling in the order write path with deterministic pricing and explicit actionable rejection messages.
- Added conflict enforcement so an explicit incentive code is rejected when it does not outperform current membership benefit.
- Kept response envelope and payment method behavior stable while exposing applied incentive summary data.
- Updated checkout payment UI and service contract to carry incentive code input and render server-provided rejection feedback.
- Added node-based regression tests for incentive validation/conflict paths and preserved existing order/payment invariants.
- Added UI test cases for incentive input and aria-live error rendering; execution currently blocked by pre-existing vitest/jsdom worker issue.

### File List

- _bmad-output/implementation-artifacts/4-2-incentive-application-and-validation-rules.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/orders/route.ts
- components/screens/CheckoutPaymentScreen.tsx
- services/order.service.ts
- tests/orders/order-service.test.ts
- tests/orders/orders-route.test.ts
- tests/vitest/membership-benefit-visibility.test.tsx

## Change Log

- 2026-04-06: Implemented Story 4.2 incentive validation rules across order API, checkout integration, and regression coverage.
- 2026-04-06: Updated Story 4.2 status to `review` with completion notes, file list, and validation evidence.

