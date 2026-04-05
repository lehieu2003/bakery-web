# Story 3.2: Checkout Submission and Payment Method Selection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to provide delivery information and choose payment method,
so that I can place an order successfully.

## Acceptance Criteria

1. Given my cart has valid items, when I submit checkout form and payment option, then the system creates a pending order with validated customer and delivery data.
2. Given my cart has valid items, when I choose a supported payment method at checkout, then order creation and payment initiation return a contract-consistent response envelope for all methods (COD/MOMO/ZALOPAY/BANK_TRANSFER support at API boundary).
3. Given checkout request validation fails (missing fields, invalid phone, invalid item quantity, unavailable or insufficient-stock product), when order creation is attempted, then the API returns deterministic validation errors without partial or corrupt order state.
4. Given purchase flow quality constraints, when checkout submission is executed, then write-path behavior remains aligned with FR13/FR14 and NFR checkout constraints (low failure rate target, no regression-prone contract drift).
5. Given a user taps submit repeatedly during checkout, when order placement is in-flight, then duplicate client submissions are blocked and the UX exposes one deterministic result path (redirect, inline error, or success) without creating race-prone behavior.

## Tasks / Subtasks

- [x] Harden checkout info capture and payload readiness across info -> payment screens (AC: 1, 4)
- [x] Ensure checkout info includes all required delivery/customer fields consumed by order creation (`customerName`, `customerPhone`, optional email/address with explicit UX treatment).
- [x] Prevent progression to payment screen with incomplete or invalid checkout info; preserve existing phone-validation behavior and error feedback.
- [x] Keep cart-derived totals and item mapping deterministic from Story 3.1 cart source of truth (`lib/cart-store.tsx`).

- [x] Align payment method selection and API contract handling in UI/service layers (AC: 2, 4)
- [x] Keep supported method set synchronized between UI (`CheckoutPaymentScreen`) and API (`app/api/orders/route.ts`): COD, MOMO, ZALOPAY, BANK_TRANSFER.
- [x] If BANK_TRANSFER remains unsupported in UI for this story scope, explicitly document as deferred in `_bmad-output/implementation-artifacts/deferred-work.md` and keep API contract unchanged.
- [x] Preserve response envelope handling in client (`{ success, data?, error? }`) and result mapping (`paymentUrl`, `paymentError`, `order`).
- [x] Preserve one in-flight submit guard (`isSubmitting`) so rapid repeat clicks do not trigger parallel order requests.

- [x] Strengthen order creation validation and transactional safety in orders route (AC: 1, 3, 4)
- [x] Keep server-side validation authoritative for required fields, VN phone format, item quantity bounds (1..100), and product availability checks.
- [x] Ensure stock decrement + order creation remains transactional and no partial write survives failed paths.
- [x] Keep order initial status `PENDING` and maintain payment provider branch behavior without callback-finalization logic leak (reserved for Story 3.3).

- [x] Add regression tests for checkout submission and payment selection behavior (AC: 1, 2, 3, 4)
- [x] Add route-level tests for `POST /api/orders` covering success paths and validation failures.
- [x] Add tests for payment-method branching behavior and response shape consistency.
- [x] Add route-level regression test for BANK_TRANSFER branch (`paymentUrl: null` + successful order envelope), even if UI keeps this method hidden.
- [x] Add/adjust service-level tests for `orderService.createOrder` payload/response compatibility.
- [x] Add UI behavior test coverage (or component-level assertion) for in-flight submit lock to prevent duplicate POST calls.

## Dev Notes

- Epic context:
- Story 3.2 builds directly on Story 3.1 cart integrity and establishes the order-creation foundation for payment callback finalization in Story 3.3.

- Architecture guardrails:
- Keep layering intact: UI (`app/(web)/checkout/*`, `components/screens/*`) -> service (`services/order.service.ts`) -> route (`app/api/orders/route.ts`) -> domain/infrastructure (`lib/*`, Prisma).
- Preserve API response envelope and naming conventions.
- Keep payment/order integrity constraints explicit, but do not implement callback idempotency/finalization here (Story 3.3 scope).

- Cross-story dependency notes:
- Depends on Story 3.1 deterministic cart payload behavior.
- Produces stable pending-order/payment-init outputs consumed by Stories 3.3 and 3.4.

- Previous story intelligence (3.1):
- Cart identity and persistence were hardened; reuse that source of truth and avoid adding parallel cart containers.
- Recent fix added resilient cart-item normalization and mobile add-to-cart CTA visibility; checkout must consume cart lines without assuming optional fields are always present.

- Current branch intelligence:
- Checkout screens exist and already call `orderService.createOrder`.
- Orders API route already validates fields and performs transactional order creation + stock decrement.
- Test coverage exists for auth/products/content/cart; order-route test coverage is currently missing and should be introduced in this story.

### Project Structure Notes

- Primary touch points:
- `app/(web)/checkout/info/page.tsx`
- `app/(web)/checkout/payment/page.tsx`
- `components/screens/CheckoutInfoScreen.tsx`
- `components/screens/CheckoutPaymentScreen.tsx`
- `services/order.service.ts`
- `app/api/orders/route.ts`
- `types/api.types.ts` (if contract typing adjustments are needed)
- `tests/orders/**` (new test folder expected for this story)

### Testing Requirements

- Route-level validation coverage for `POST /api/orders`:
- Missing required fields -> 400
- Invalid VN phone -> 400
- Invalid payment method -> 400
- Invalid quantity (<1 or >100) -> 400
- Product unavailable/out-of-stock -> 400
- Valid COD checkout -> success envelope with `paymentUrl: null`

- Payment method behavior coverage:
- MOMO/ZALOPAY branch returns `paymentUrl` on gateway success and `paymentError` on provider failure without throwing unhandled errors.
- Contract shape remains stable for all payment branches.

- Frontend/service compatibility:
- Checkout screens provide payload shape accepted by `CreateOrderPayload`.
- Error and submitting states remain deterministic in `CheckoutPaymentScreen`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-32-Checkout-Submission-and-Payment-Method-Selection]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Cart-Checkout--Order-Lifecycle]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/3-1-cart-management.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first backlog story from sprint status: `3-2-checkout-submission-and-payment-method-selection`.
- Loaded epics, PRD, architecture, project-context, and previous story (3.1) for dependency-aware context assembly.
- Mapped current implementation touchpoints in checkout screens, order service, and orders API route.
- Refactored `app/api/orders/route.ts` to expose `handleCreateOrderRequest` with dependency injection for route-level testability while preserving production behavior.
- Extended checkout information capture to include optional email/address and persisted delivery method in `cart-store`/`cart-utils`.
- Added in-flight request guard in payment submission path using `canSubmitOrderRequest` helper + ref lock to prevent duplicate order POST races.
- Added Story 3.2 regression tests and executed full suite (`npx tsx --test tests/**/*.test.ts`) and lint (`npm run lint`).

### Completion Notes List

- Prepared story context for implementing checkout submission and payment method selection with contract stability.
- Added explicit guardrails to avoid scope bleed into callback finalization (Story 3.3).
- Added concrete testing expectations for missing order-route regression coverage.
- Implemented checkout info hardening with deterministic validation and progression rules (name/phone required, email format validation, delivery address required when method is delivery).
- Synchronized UI/API payment method support by adding `BANK_TRANSFER` option in checkout payment screen and preserving API response envelope behavior.
- Preserved transactional order creation behavior and validation guardrails in the orders route while enabling isolated route tests through injected dependencies.
- Added regression tests:
  - `tests/orders/orders-route.test.ts` (validation, branch behavior, response shape, BANK_TRANSFER contract)
  - `tests/orders/order-service.test.ts` (service payload/endpoint compatibility)
  - `tests/orders/checkout-utils.test.ts` (duplicate-submit guard utility)
- Verified no regressions: all tests pass (`86/86`); lint passes with one pre-existing warning in `app/api/public/products/filters/route.ts`.

### File List

- \_bmad-output/implementation-artifacts/3-2-checkout-submission-and-payment-method-selection.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/orders/route.ts
- components/screens/CheckoutInfoScreen.tsx
- components/screens/CheckoutPaymentScreen.tsx
- lib/cart-store.tsx
- lib/cart-utils.ts
- lib/checkout-utils.ts
- tests/orders/orders-route.test.ts
- tests/orders/order-service.test.ts
- tests/orders/checkout-utils.test.ts

## Change Log

- 2026-04-05: Implemented Story 3.2 checkout submission/payment selection, added order-route/service/submit-lock regression tests, and validated with full test + lint run.

