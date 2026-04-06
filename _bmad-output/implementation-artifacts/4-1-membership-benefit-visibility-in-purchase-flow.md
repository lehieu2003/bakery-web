# Story 4.1: Membership Benefit Visibility in Purchase Flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning member,
I want to see my eligible benefits during shopping and checkout,
so that I can make informed purchase decisions.

## Acceptance Criteria

1. Given I am logged in with a membership tier, when I browse cart or checkout, then the system displays currently applicable member benefits and points context.
2. Given I am logged in with a membership tier, when I browse cart or checkout, then unavailable benefits are explained with clear eligibility messages.

## Tasks / Subtasks

- [x] Create a single source of truth for membership benefit rules and discount percentages (AC: 1, 2)
- [x] Replace duplicated hardcoded discount maps in cart/checkout/order flow with shared membership-rule resolution sourced from persisted settings.
- [x] Keep percentage/points threshold logic deterministic across API and UI (`SILVER`, `GOLD`, `PLATINUM`).
- [x] Preserve existing order total invariants and rounding behavior after moving to shared rule resolution.

- [x] Add a customer-facing membership benefits read model for purchase surfaces (AC: 1, 2)
- [x] Expose a route-layer contract that returns current user points/tier context plus benefit eligibility/explanation for the next tier.
- [x] Keep route contract envelope-compliant (`{ success, data?, error? }`) and authorization-safe.
- [x] Return actionable explanation copy for ineligible tiers (for example points needed to unlock next benefit), not only numeric values.

- [x] Integrate benefit visibility into cart and checkout screens without introducing client-invented pricing logic (AC: 1, 2)
- [x] Update `CartScreen`, `CheckoutInfoScreen`, and `CheckoutPaymentScreen` to render authoritative benefit context.
- [x] Ensure guest state remains explicit (`sign in to unlock benefits`) and does not imply eligibility.
- [x] Keep all final discount math authoritative from server responses and shared rule logic, not divergent per-screen calculations.

- [x] Add regression coverage for benefit visibility and non-regression in order totals (AC: 1, 2)
- [x] Add route-level tests for the membership benefits read model contract and auth behavior.
- [x] Extend order route tests to confirm discount computation remains consistent with shared membership settings.
- [x] Add UI-focused tests for eligibility messaging and points context rendering across logged-in and guest states.

### Review Findings

- [x] [Review][Patch] Eligibility message can contradict assigned tier when points and member level diverge [lib/membership/rules.ts:194] — fixed via current-tier-relative next-tier computation
- [x] [Review][Patch] Unbounded discount percentages from settings can produce invalid totals or surcharges in checkout math [app/api/orders/route.ts:340] — fixed via membership-rule sanitization and clamp usage
- [x] [Review][Patch] UI-focused coverage for cart/checkout eligibility messaging and screen-reader output is missing [tests/orders/membership-benefits-route.test.ts:1] — added Vitest UI coverage in tests/vitest/membership-benefit-visibility.test.tsx
## Dev Notes

- Epic context:
- Story 4.1 starts Epic 4 and establishes trustworthy benefit visibility before incentive application logic (Story 4.2), quick reorder (Story 4.3), and personalization surfaces (Story 4.4).

- Scope boundaries:
- In scope: visibility and explanation of member benefits in cart/checkout purchase flow.
- Out of scope: complex incentive conflict resolution/application engine (Story 4.2), reorder automation (Story 4.3), and personalized recommendation ranking (Story 4.4).

- Architecture guardrails:
- Preserve route -> service -> hook -> screen layering.
- Preserve API response envelope and stable error mapping.
- Do not regress payment/order integrity constraints from Epic 3 (idempotency/reconciliation and consistent order states remain non-negotiable).

- Reuse-first implementation guidance:
- Reuse existing membership settings authority in `app/api/admin/membership/route.ts`; do not introduce a second membership-config source.
- Remove hardcoded `DISCOUNT_RATE` duplication currently present in:
  - `components/screens/CartScreen.tsx`
  - `components/screens/CheckoutInfoScreen.tsx`
  - `components/screens/CheckoutPaymentScreen.tsx`
  - `app/api/orders/route.ts`
- Keep cart user context wired through `lib/cart-store.tsx` (`memberLevel` + `points` projection) and avoid legacy store duplication.

- Cross-story dependency notes:
- Story 4.1 depends on membership identity/profile groundwork from Epic 1 and order/checkout integrity from Epic 3.
- Story 4.2 should consume the same shared membership rule primitives created in this story to avoid drift.

- Current branch intelligence:
- Recent completed work (`3-4`) already hardened order-history status truth from backend data.
- This story must keep the same principle: UI displays authoritative eligibility and discount context, not ad-hoc client-derived business rules.

- Library/framework guardrails:
- Use currently pinned stack (no framework upgrade in this story): Next.js `16.1.6`, React `19.2.3`, React Query `5.90.x`, Prisma Client `6.x`.

### Project Structure Notes

- Primary touch points:
- `app/api/orders/route.ts`
- `app/api/admin/membership/route.ts`
- `components/screens/CartScreen.tsx`
- `components/screens/CheckoutInfoScreen.tsx`
- `components/screens/CheckoutPaymentScreen.tsx`
- `lib/cart-store.tsx`
- `services/order.service.ts`
- `lib/api/endpoints.ts`
- `tests/orders/orders-route.test.ts`
- `tests/orders/order-service.test.ts`

- Likely new touch points:
- `app/api/membership/**/route.ts` (customer-facing membership benefits read model)
- `services/membership.service.ts` and/or `hooks/use-membership.ts` (if needed for screen data flow)
- `lib/membership/**` (shared eligibility/discount rule helpers)

### Testing Requirements

- Contract and auth behavior:
- Membership benefits endpoint returns envelope shape and deterministic benefit payload for authenticated customer requests.
- Unauthorized requests receive stable auth error behavior according to route policy.

- Pricing and integrity behavior:
- Checkout/order discount computation uses shared membership rule source and remains consistent with visibility shown in purchase surfaces.
- No regression in order totals, payment method handling, or existing order creation validations.

- UI behavior:
- Logged-in member sees current tier benefits and points context in cart and checkout surfaces.
- Ineligible/locked benefits render clear eligibility explanation (for example remaining points to next tier).
- Guest users see explicit non-member messaging and no false benefit claims.
- Benefit eligibility and status/error messages are perceivable by screen readers (NFR19) across cart and checkout surfaces.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-41-Membership-Benefit-Visibility-in-Purchase-Flow]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Loyalty-Incentives--Reorder]
- [Source: _bmad-output/planning-artifacts/prd.md#Loyalty-Promotions--Reorder]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/3-4-confirmation-order-history-and-status-tracking.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- DS invoked via menu code selection for Story `4-1-membership-benefit-visibility-in-purchase-flow`.
- Executed red phase tests first:
  - Added order discount-setting alignment test in `tests/orders/orders-route.test.ts`.
  - Added new route contract tests in `tests/orders/membership-benefits-route.test.ts`.
- Implemented shared membership rules source and eligibility view model in `lib/membership/rules.ts`.
- Added authenticated customer API read model `GET /api/membership/benefits` in `app/api/membership/benefits/route.ts`.
- Refactored `app/api/orders/route.ts` to resolve discount percent from shared membership settings rather than hardcoded maps.
- Added client integration path:
  - endpoint constant in `lib/api/endpoints.ts`
  - service in `services/membership-benefits.service.ts`
  - hook in `hooks/use-membership-benefits.ts`
  - screen wiring in cart + checkout surfaces.
- Added regression tests:
  - `tests/orders/membership-rules.test.ts`
  - `tests/orders/membership-benefits-service.test.ts`
  - `tests/orders/membership-benefits-route.test.ts`
  - updated `tests/orders/orders-route.test.ts`
- Validation commands executed successfully:
  - `npx tsx --test tests/orders/orders-route.test.ts tests/orders/membership-benefits-route.test.ts tests/orders/membership-rules.test.ts tests/orders/membership-benefits-service.test.ts`
  - `npx tsx --test tests/**/*.test.ts` (full suite)
  - `npx tsc --noEmit -p tsconfig.json`
  - `npm run lint` (passes with one pre-existing warning in `app/api/public/products/filters/route.ts`).

### Completion Notes List

- Implemented a single shared membership rules source (`lib/membership/rules.ts`) to centralize tier thresholds and discount percentages from persisted settings.
- Replaced hardcoded discount maps in purchase flow and order write path with shared membership settings resolution.
- Added customer-facing membership benefits API with points context, current tier, next-tier eligibility, and clear explanation message.
- Integrated authoritative membership context into cart and checkout screens with guest-safe behavior and screen-reader-friendly status messaging (`aria-live='polite'`).
- Added route/service/rules regression tests to verify auth boundary, contract consistency, eligibility messaging, and discount computation integrity.
- Verified full regression, type checks, and lint quality gates.

### File List

- _bmad-output/implementation-artifacts/4-1-membership-benefit-visibility-in-purchase-flow.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/membership/benefits/route.ts
- app/api/orders/route.ts
- components/screens/CartScreen.tsx
- components/screens/CheckoutInfoScreen.tsx
- components/screens/CheckoutPaymentScreen.tsx
- hooks/index.ts
- hooks/use-membership-benefits.ts
- lib/api/endpoints.ts
- lib/membership/rules.ts
- services/index.ts
- services/membership-benefits.service.ts
- tests/orders/membership-benefits-route.test.ts
- tests/orders/membership-benefits-service.test.ts
- tests/orders/membership-rules.test.ts
- tests/orders/orders-route.test.ts
- types/api.types.ts

## Change Log

- 2026-04-06: Created Story 4.1 context and prepared sprint tracking transition to `ready-for-dev`.
- 2026-04-06: Implemented Story 4.1 membership benefit visibility with shared membership settings resolution, customer benefits API, purchase-flow UI integration, and regression tests.




