# Story 3.4: Confirmation, Order History, and Status Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to receive confirmation and monitor order progress,
so that I trust the purchase process.

## Acceptance Criteria

1. Given an order reaches confirmed or paid status, when post-checkout processing completes, then customer-visible confirmation reflects authoritative backend order/payment state and remains consistent across refresh/navigation.
2. Given an authenticated user requests order history, when `/api/orders` read flow executes, then only that user's orders are returned with status and payment metadata needed for tracking UI.
3. Given payment outcomes can be delayed, failed, or retried, when confirmation/history surfaces render, then they show final reconciled states from callback processing without client-side status invention.
4. Given guest checkout is allowed, when an unauthenticated user accesses member history surfaces, then protected history endpoints remain unauthorized and guest visibility follows explicit non-member flow only.
5. Given FR16/FR17/FR18 and NFR13 constraints, when confirmation and tracking are implemented, then order/payment transitions remain consistent under retries/recovery and do not regress finalized states.

## Tasks / Subtasks

- [x] Consolidate confirmation and status presentation onto authoritative order data contracts (AC: 1, 3, 5)
  - [x] Remove/replace placeholder confirmation behavior that relies only on query param `order` in `app/(web)/checkout/success/page.tsx`.
  - [x] Define deterministic UI mapping for `Order.status` and `payment.status` without creating derived terminal states on client.
  - [x] Ensure delayed callback scenarios render safely (e.g., pending -> confirmed/failed after reconciliation).

- [x] Harden customer order history API read model for tracking use cases (AC: 2, 4, 5)
  - [x] Validate `GET /api/orders` response shape remains standardized and includes fields needed by confirmation/history UI.
  - [x] Keep auth boundary strict (`401` for unauthenticated calls) and verify no cross-user leakage.
  - [x] Add safe projection/serialization if needed to avoid overexposure while preserving status visibility.

- [x] Implement order history and status tracking UX integration in profile/customer surfaces (AC: 1, 2, 3)
  - [x] Update order history rendering in `components/screens/ProfileScreen.tsx` to show status/payment progression clearly.
  - [x] Ensure loading/empty/error states are explicit and non-misleading.
  - [x] Preserve existing service/hook layering (`hooks/use-orders.ts` -> `services/order.service.ts` -> `/api/orders`).

- [x] Add regression tests for confirmation + history state integrity (AC: 2, 3, 4, 5)
  - [x] Add/extend route-level tests for `GET /api/orders` auth boundary and data contract expectations.
  - [x] Add UI-focused tests for status rendering behavior under pending/paid/failed/cancelled outcomes.
  - [x] Add test coverage proving callback-finalized outcomes are reflected in customer-facing history.

## Dev Notes

- Epic context:
- Story 3.4 completes Epic 3 by exposing customer-facing confirmation and status tracking on top of already stabilized order creation (3.2) and callback finalization/idempotency (3.3).

- Architecture guardrails:
- Checkout/order reliability boundaries live at server routes and payment callback handlers; UI must consume, not redefine, domain state.
- Keep API contract consistency (`success`, `data`, `error`) and auth boundaries aligned with existing route patterns.
- Preserve reconciliation truth from `app/api/payment/*/callback` transitions (PAID/FAILED and order CONFIRMED/CANCELLED outcomes).

- Scope boundary clarification:
- In Story 3.4, "confirmation via configured channels" is implemented as in-app confirmation/history surfaces.
- External event-driven notifications (email/SMS/inbox dispatch orchestration) remain in Epic 5 and are out of scope for this story.
- Cross-story dependency notes:
- Depends on Story 3.2 order creation (`app/api/orders/route.ts`) and Story 3.3 callback reconciliation handlers.
- Must not undo idempotency/conflict protections introduced in Story 3.3.

- Previous story intelligence (3.3):
- Callback handlers were refactored to testable `handle*CallbackRequest` functions with dependency injection and deterministic replay/conflict handling.
- Failed callbacks now finalize orders as `CANCELLED`; status inference for ZaloPay was hardened to reject unknown status payloads.
- Story 3.4 should consume these finalized states directly in confirmation/history surfaces.

- Git intelligence summary:
- `f948cf4`: story 3.3 callback hardening and CR patch fixes.
- `8088c29`: story 3.2 checkout submission and payment method flow implementation.
- `dcf5870`: cart behavior stabilization in story 3.1.

### Project Structure Notes

- Existing touch points likely relevant:
- `app/(web)/checkout/success/page.tsx`
- `components/screens/ProfileScreen.tsx`
- `hooks/use-orders.ts`
- `services/order.service.ts`
- `app/api/orders/route.ts`
- `tests/orders/*.test.ts` (existing order route test patterns)
- `tests/payment/*.test.ts` (authoritative callback state references)

- Structure/pattern alignment:
- Keep route handlers in `app/api/*` as domain boundary and continue using explicit validation + envelope responses.
- Keep frontend access via service + hook layers, not direct fetch calls in presentation components.

### Testing Requirements

- API behavior:
- `GET /api/orders` returns `401` when unauthenticated.
- Authenticated response includes stable order status/payment data and newest-first ordering.

- UI behavior:
- Confirmation/history views correctly reflect `PENDING`, `CONFIRMED`, `CANCELLED` and payment status outcomes.
- No optimistic client state should contradict persisted backend states.

- Regression safety:
- Ensure callback-reconciled outcomes from Story 3.3 are visible in customer history without mutation.
- Run full validation gates before review: tests, typecheck, lint.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-34-Confirmation-Order-History-and-Status-Tracking]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Cart-Checkout--Order-Lifecycle]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration-Points]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/3-2-checkout-submission-and-payment-method-selection.md]
- [Source: _bmad-output/implementation-artifacts/3-3-payment-callback-finalization-with-idempotency.md]

## Story Context Status

- Story file created with implementation-focused context and guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Target story selected from sprint backlog: `3-4-confirmation-order-history-and-status-tracking`.
- Loaded Epic 3 and extracted Story 3.4 acceptance baseline.
- Analyzed existing order and payment surfaces:
  - `app/api/orders/route.ts`
  - `app/(web)/checkout/success/page.tsx`
  - `components/screens/ProfileScreen.tsx`
  - `hooks/use-orders.ts`
  - `services/order.service.ts`
- Imported previous-story constraints from Story 3.3 callback finalization/idempotency fixes.
- Implemented handleGetOrdersRequest + serialization in pp/api/orders/route.ts and kept route envelope semantics.
- Added shared order status presentation helpers in lib/orders/presentation.ts.
- Updated components/screens/SuccessScreen.tsx to render authenticated confirmation status from /api/orders data.
- Updated components/screens/ProfileScreen.tsx to display order/payment status badges.
- Added auth-aware orders querying in hooks/use-orders.ts and optional skip-auth-redirect in services/order.service.ts.
- Added tests:
  - 	ests/orders/orders-route.test.ts (GET unauthorized + serialized contract)
  - 	ests/orders/order-presentation.test.ts (status mapping behavior)

### Completion Notes List

- Prepared Story 3.4 context with explicit boundaries between authoritative backend state and UI representation.
- Captured auth boundary expectation for member order history (`401` for unauthenticated).
- Highlighted guest-vs-member flow constraints to prevent ambiguous tracking behavior.
- Added testing guardrails to verify confirmation/history consistency under delayed or failed callback outcomes.

### File List

- _bmad-output/implementation-artifacts/3-4-confirmation-order-history-and-status-tracking.md
- _bmad-output/implementation-artifacts/story-validation-report-3-4-confirmation-order-history-and-status-tracking-2026-04-05.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/orders/route.ts
- components/screens/ProfileScreen.tsx
- components/screens/SuccessScreen.tsx
- hooks/use-orders.ts
- services/order.service.ts
- lib/orders/presentation.ts
- tests/orders/orders-route.test.ts
- tests/orders/order-presentation.test.ts

## Change Log

- 2026-04-05: Created Story 3.4 context with confirmation/history/status-tracking guardrails and sprint status transition to ready-for-dev.
- 2026-04-05: Implemented Story 3.4 confirmation + order history status tracking with GET orders read-model hardening and regression tests.





