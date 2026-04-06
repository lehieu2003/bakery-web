# Story 4.6: Coupon Policy and Usage Lifecycle Hardening

Status: review

## Story

As a customer and business operator,
I want coupon eligibility, ownership, and usage accounting to be consistent from issuance through order finalization,
so that users are not blocked by unfair rejections and operations can safely run promotions.

## Acceptance Criteria

1. Given a coupon has limited usage, when an order fails/cancels/expires before successful finalization, then coupon usage is not permanently consumed.
2. Given coupon usage is limited, when order finalization is completed successfully, then coupon usage is consumed exactly once and remains replay-safe under callback retries.
3. Given I see an offer in checkout discovery, when I apply it on submit, then server-side validation criteria are consistent with discovery rules and rejection reasons are explicit/actionable.
4. Given membership discount and coupon may conflict, when checkout validation runs, then precedence is deterministic: coupon applies only if coupon discount is strictly greater; equal/lower must be rejected with clear correction guidance.
5. Given coupon issuance source differs, when discovery API returns available offers, then visibility is enforced by source type:
6. Public coupon: visible to all eligible users.
7. Targeted/private coupon: visible only to assigned user or eligible segment.
8. Triggered coupon: visible only after trigger event generates/assigns coupon to user.
9. Given eligibility is evaluated, when coupon scope restrictions exist, then product/category scope and per-user limit are enforced in addition to global `usageLimit`.
10. Given operations need to run promotions safely, when coupon rules are changed, then RBAC ownership is enforced:
11. Marketing/Campaign Manager: create/update/set validity window.
12. Finance/Admin: activate/deactivate.
13. System/Automated: issue triggered coupons from approved workflows.
14. Given coupon governance actions occur, when a critical mutation is saved, then audit log captures actor, role, timestamp, mutation type, and before/after of critical fields.
15. Given I apply a valid coupon code in checkout, when coupon validation succeeds, then order summary total is recalculated immediately and UI shows explicit coupon discount amount (e.g. `-50.000đ`) in the pricing breakdown.

## Tasks / Subtasks

- [ ] Harden coupon usage lifecycle accounting (AC: 1, 2)
- [ ] Replace direct usage decrement-on-order-create with reservation-safe lifecycle (`reserve -> commit/release`) or equivalent deterministic mechanism.
- [ ] Persist coupon usage lifecycle state (e.g., `CouponRedemption` ledger keyed by `couponId`, `orderId`, `userId`, `state`) for traceability.
- [ ] Ensure failed payment callbacks, order cancellation paths, and reconciliation rollback release reserved usage correctly.
- [ ] Ensure finalization path consumes usage exactly once and remains idempotent under callback retries.
- [ ] Add race-safe concurrency handling for limited coupons under simultaneous checkout attempts.

- [ ] Align discovery and submit-time coupon policy rules (AC: 3, 4)
- [ ] Extract shared eligibility policy function used by both `GET /api/incentives/available` and `POST /api/orders` validation.
- [ ] Keep API envelope stable (`{ success, data?, error? }`) while standardizing rejection reason taxonomy.
- [ ] Keep one-incentive-per-order rule explicit across API and UI messaging.
- [ ] Enforce deterministic conflict handling with membership benefit and stable message contract.
- [ ] Add checkout coupon preview/recalculation flow so apply action updates discount and total immediately after successful validation (server-authoritative preview).
- [ ] Show explicit coupon discount line item in pricing summary (`Coupon discount: -Xđ`) and update grand total in the same render cycle.

- [ ] Add issuance-source and targeting model (AC: 5, 6, 7, 8)
- [ ] Add issuance metadata to coupon policy (`PUBLIC | TARGETED | TRIGGERED`).
- [ ] Add `TargetSegment` and/or `CouponAssignment` model so discovery API can filter targeted/private offers correctly.
- [ ] Add generated-assignment path for triggered coupons from approved workflows.

- [ ] Expand eligibility rules beyond min-order/time-window (AC: 9)
- [ ] Add product/category applicability scope checks.
- [ ] Add per-user usage limit policy separate from global `usageLimit`.
- [ ] Ensure discovery list excludes offers that are impossible to apply for current user/cart context.

- [ ] Establish coupon governance ownership path (AC: 10, 11, 12, 13)
- [ ] Define RBAC permission matrix for coupon actions (`create`, `update`, `activate`, `deactivate`, `issue-triggered`).
- [ ] Enforce RBAC checks on all coupon mutation APIs.
- [ ] Add or formalize admin capability surface for coupon lifecycle operations.
- [ ] Add `Coupon Create Wizard` requirements for mandatory fields: campaign objective, max budget, owner.

- [ ] Implement auditability for governance actions (AC: 14)
- [ ] Record actor + role + timestamp + mutation type + before/after critical fields (`usageLimit`, validity window, active state, scope, segment/assignment).
- [ ] Ensure audit queries support incident investigation use cases.

- [ ] Add regression coverage (AC: 1..14)
- [ ] Add route-level tests for usage lifecycle under success/failure/cancel/retry conditions.
- [ ] Add policy-parity tests ensuring discovery and submit use the same eligibility outcomes for identical inputs.
- [ ] Add tests for membership-vs-coupon conflict decisions and user-facing error contract.
- [ ] Add tests for product/category scope and per-user limit eligibility.
- [ ] Add tests for targeted/private visibility and triggered issuance visibility.
- [ ] Add concurrency tests for limited coupons near exhaustion thresholds.
- [ ] Add RBAC and audit-log tests for coupon governance mutations.
- [ ] Add UI/contract tests verifying coupon apply action recalculates total and renders explicit coupon discount amount in checkout summary.

## Dev Notes

- Scope boundaries:
- In scope: coupon usage integrity, policy consistency, conflict determinism, issuance governance, and auditability.
- Out of scope: recommendation ranking/ML campaign optimization.

- Current inconsistency baseline to fix:
- `usageLimit` is currently decremented during order creation flow, creating risk of coupon-burn on non-finalized orders.
- Discovery endpoint and order-submit endpoint both evaluate eligibility, but policy evolution risk exists unless logic is centralized.
- Coupon operations ownership and RBAC boundaries are not explicit in current admin flow.
- Current baseline lacks explicit persisted coupon-redemption lifecycle state, limiting operational traceability and safe rollback behaviors.

- Architecture guardrails:
- Preserve route -> service -> hook -> screen layering.
- Preserve response envelope and existing error-handling contract style.
- Keep payment/order integrity and reconciliation invariants intact (idempotency-safe).
- Preserve compatibility for existing checkout payload shape (`incentiveCode`) and avoid breaking existing order placement clients.

### Project Structure Notes

- Primary touch points:
- `app/api/orders/route.ts`
- `app/api/incentives/available/route.ts`
- `app/api/admin/**` (coupon governance capability)
- `services/order.service.ts`
- `services/incentive-discovery.service.ts`
- `components/screens/CheckoutPaymentScreen.tsx`
- `prisma/schema.prisma` (coupon issuance/assignment/redemption lifecycle state)
- `tests/orders/*`
- `tests/vitest/*`

### Testing Requirements

- Verify limited coupon is not permanently consumed when order fails/cancels before finalization.
- Verify successful finalized orders consume usage exactly once.
- Verify available-offers list and order-submit validation return policy-consistent outcomes for identical cart context.
- Verify equal-or-lower coupon benefit against membership follows deterministic rejection with stable message contract.
- Verify product/category scope and per-user usage limits are enforced correctly.
- Verify targeted/private and triggered coupon visibility rules are correct in discovery.
- Verify RBAC enforcement across coupon governance actions.
- Verify audit logs capture mutation actor/role/timestamp and before/after critical values.
- Verify concurrency behavior near `usageLimit` exhaustion is race-safe.
- Verify successful coupon apply recalculates checkout total immediately and displays explicit coupon discount amount in pricing breakdown.

### References

- Coupon discovery route: `app/api/incentives/available/route.ts`
- Order validation + usage decrement logic: `app/api/orders/route.ts`
- Checkout offer UI and one-code messaging: `components/screens/CheckoutPaymentScreen.tsx`
- Coupon schema fields (`type`, `value`, `minOrder`, `maxDiscount`, `usageLimit`, `startAt`, `endAt`, `isActive`): `prisma/schema.prisma`
- Seed coupon examples (current baseline): `prisma/seed.ts`

## Story Context Status

- Corrective story created from production-readiness gap review after Epic 4 coupon workflows.
- Governance extension added to define ownership, issuance criteria, and auditable control path.
- Priority intent: resolve coupon unfairness, policy ambiguity, and operational ownership before expanding new growth features.

