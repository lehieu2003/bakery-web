# Story 3.3: Payment Callback Finalization with Idempotency

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the platform,
I want to finalize order state from payment callbacks safely,
so that duplicate callbacks do not corrupt order outcomes.

## Acceptance Criteria

1. Given a payment callback is received for an existing order, when callback processing runs multiple times for the same transaction, then idempotency controls ensure a single authoritative order/payment state.
2. Given callback payloads can be invalid, replayed, or malformed, when callback processing executes, then signature verification, payload validation, and replay-safe behavior prevent unsafe state transitions.
3. Given callback outcomes must be auditable, when callback handling completes (success/failure/already processed), then correlation keys and structured lifecycle logs are emitted for reconciliation and support investigation.
4. Given order/payment reliability constraints (FR15/FR18, NFR9/NFR12/NFR13), when payment callback finalization is implemented, then order and payment transitions remain consistent under retries and recovery conditions.
5. Given duplicated callbacks may carry conflicting outcomes, when a transaction has already been finalized, then subsequent conflicting callback outcomes must not override the authoritative payment/order state and must be logged for reconciliation.

## Tasks / Subtasks

- [x] Harden callback validation and idempotent state transitions for MoMo and ZaloPay handlers (AC: 1, 2, 4)
- [x] Refactor callback routes into testable handler functions with injectable dependencies (similar to existing route-handler test patterns).
- [x] Enforce deterministic preconditions before updates (payment exists, linked order exists, expected pending state, safe transition matrix).
- [x] Keep duplicate/replayed callbacks side-effect free after first terminal update (idempotent return path).
- [x] Persist/validate provider transaction correlation (`transactionId`/provider reference) to identify duplicate-vs-conflicting callbacks deterministically.

- [x] Normalize provider-specific callback semantics into unified order/payment transition rules (AC: 1, 4)
- [x] MoMo: map `resultCode` outcomes to payment/order transitions deterministically.
- [x] ZaloPay: map callback payload + transaction result into deterministic payment/order transitions.
- [x] Keep order status advancement constrained to valid transitions only; do not regress terminal states.

- [x] Add structured observability and reconciliation-ready metadata (AC: 3, 4)
- [x] Emit correlation-aware logs/events at key points (`payment.callback.received`, `payment.callback.processed`, idempotent replay branch, verification failure).
- [x] Include provider transaction identifiers and order correlation keys in logs without exposing secrets.
- [x] Log explicit conflict branch when callback outcome disagrees with already-finalized payment/order state.
- [x] Ensure callback error responses remain provider-compatible while preserving internal diagnostics.

- [x] Add regression tests for callback idempotency and consistency behavior (AC: 1, 2, 3, 4)
- [x] Add route-level tests for MoMo callback success/failure/invalid signature/replay scenarios.
- [x] Add route-level tests for ZaloPay callback success/failure/invalid MAC/replay scenarios.
- [x] Add tests proving duplicate callbacks do not mutate already-finalized payment/order state.
- [x] Add tests proving conflicting duplicate callbacks are ignored and recorded (no state rollback/flip).

### Review Findings

- [x] [Review][Patch] ZaloPay status inference may mark successful callbacks as FAILED when payload omits `status`/`return_code` [app/api/payment/zalopay/callback/route.ts:89]
- [x] [Review][Patch] Failed payment callbacks do not finalize order status (order remains PENDING) for non-PAID outcomes [app/api/payment/momo/callback/route.ts:43]

## Dev Notes

- Epic context:
- Story 3.3 finalizes transactional integrity after Story 3.2 order creation by making callback processing replay-safe and auditable.

- Architecture guardrails:
- Payment callback and order-state consistency are non-negotiable.
- Enforce idempotent callback processing and reconciliation alignment at `app/api/payment/*` boundary.
- Preserve response envelope/contract behavior required by each provider callback protocol.

- Cross-story dependency notes:
- Depends on Story 3.2 creating pending orders/payments correctly.
- Provides stable confirmed/failed outcomes required by Story 3.4 confirmation + order tracking.

- Previous story intelligence (3.2):
- `app/api/orders/route.ts` was refactored to use testable handler-with-deps pattern; reuse this structure for callback handlers.
- Current callback routes include basic pending-state guard; story 3.3 should harden transition integrity and observability rather than re-architect checkout submission.

- Current branch intelligence:
- Existing callback handlers:
  - `app/api/payment/momo/callback/route.ts`
  - `app/api/payment/zalopay/callback/route.ts`
- Existing behavior updates payment/order for pending records but has limited explicit transition guardrails and limited structured reconciliation logging.

### Project Structure Notes

- Primary touch points:
- `app/api/payment/momo/callback/route.ts`
- `app/api/payment/zalopay/callback/route.ts`
- `lib/payment/momo.ts`
- `lib/payment/zalopay.ts`
- `lib/prisma.ts` (existing db access boundary)
- `tests/payment/**` (new tests expected)

### Testing Requirements

- Callback verification and payload guards:
- Invalid signature/MAC -> deterministic rejection response + no state mutation.
- Malformed callback payload -> safe failure response + no partial state updates.

- Idempotency and transition consistency:
- First valid callback updates payment/order as expected.
- Repeated callback for same transaction does not re-apply side effects.
- Missing payment/order references are handled safely without crashing.

- Provider branch consistency:
- MoMo success/failure resultCode mapping is stable and tested.
- ZaloPay success/failure mapping is stable and tested.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-33-Payment-Callback-Finalization-with-Idempotency]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Cart-Checkout--Order-Lifecycle]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architecture-Decision-Summary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/3-2-checkout-submission-and-payment-method-selection.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first backlog story from sprint status: `3-3-payment-callback-finalization-with-idempotency`.
- Loaded Epic 3 + PRD NFR/FR callback constraints and architecture idempotency/reconciliation guardrails.
- Inspected existing MoMo/ZaloPay callback handlers to map concrete implementation targets.
- Refactored callback routes to expose testable handlers:
  - `handleMoMoCallbackRequest`
  - `handleZaloPayCallbackRequest`
- Implemented deterministic callback guards:
  - payload normalization/validation
  - safe signature/MAC verification wrappers
  - idempotent replay handling and conflict branch logging
  - transaction correlation persistence via `payment.transactionId`
- Validation commands executed:
  - `npx tsx --test tests/payment/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts`
  - `npx tsc --noEmit -p tsconfig.json`
  - `npm run lint` (passes with one pre-existing warning in products filters route)

### Completion Notes List

- Prepared story context for callback idempotency finalization with replay-safe processing and reconciliation observability.
- Scoped work to callback/order finalization only (no checkout form/order create scope bleed).
- Added structured callback observability events for verification failures, payload issues, replay ignore, conflict branch, and successful transition processing.
- Added deterministic conflict safety: finalized payment/order states are no longer overridden by conflicting duplicate callbacks.
- Added provider-compatible response behavior across invalid, replay, conflict, and success paths for both MoMo and ZaloPay callbacks.
- Added callback regression tests:
  - `tests/payment/momo-callback-route.test.ts`
  - `tests/payment/zalopay-callback-route.test.ts`
- Verified full regression + compile gates:
  - tests pass (`98/98`)
  - type-check pass
  - lint pass with one pre-existing warning

### File List

- _bmad-output/implementation-artifacts/3-3-payment-callback-finalization-with-idempotency.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/payment/momo/callback/route.ts
- app/api/payment/zalopay/callback/route.ts
- tests/payment/momo-callback-route.test.ts
- tests/payment/zalopay-callback-route.test.ts

## Change Log

- 2026-04-05: Implemented Story 3.3 payment callback finalization with idempotency/conflict safety and added provider callback regression tests.

