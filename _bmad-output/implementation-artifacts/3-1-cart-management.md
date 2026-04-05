# Story 3.1: Cart Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer,
I want to add, update, and remove cart items,
so that I can prepare my order accurately.

## Acceptance Criteria

1. Given I browse products and variants, when I update cart quantities or remove items, then cart totals and item states recalculate correctly.
2. Given I browse products and variants, when I add the same product/variant combination multiple times, then quantity aggregation and line-item identity remain deterministic.
3. Given I refresh the app or cross authentication boundaries (guest -> signed-in, signed-in -> signed-out), when cart state is rehydrated, then cart contents persist consistently without silent data loss and follow one deterministic merge precedence strategy.
4. Given cart state changes affect checkout/order payloads, when this story is implemented, then downstream checkout/order consumers stay contract-compatible or are explicitly deferred with rationale.

## Tasks / Subtasks

- [x] Harden cart state domain and identity rules in `lib/cart-store.tsx` (AC: 1, 2, 3)
- [x] Define deterministic cart-item identity key (product + variant/options) and remove ambiguous `id` collisions from add/update/remove paths.
- [x] Preserve quantity floor/ceiling behavior and total recalculation correctness for increment/decrement and remove actions (minimum 1, maximum 100 to align with `/api/orders` validation).
- [x] Keep context API stable (`addToCart`, `removeFromCart`, `updateQty`, `clearCart`, `setCheckoutInfo`) for current screen consumers.

- [x] Implement cart persistence and rehydration strategy (AC: 3)
- [x] Add client-side persistence for cart and checkout-info (e.g., local storage) with safe parse/validation and versioned keying.
- [x] Implement auth-boundary behavior explicitly with documented precedence (`persisted guest cart` merged into current session cart by deterministic item key) so guest cart is not dropped on login/logout transitions.
- [x] Ensure hydration path is resilient to malformed persisted payloads and falls back safely.

- [x] Align all cart producers/consumers to one source of truth (AC: 1, 2, 3)
- [x] Verify add-to-cart call sites (`ProductCard`, `ProductDetailScreen`, `BestSellersSection`, `RelatedProducts`, `ChatbotBubble`) pass stable identity attributes for aggregation.
- [x] Verify cart consumers (`CartScreen`, `CheckoutInfoScreen`, `CheckoutPaymentScreen`, navbar badge) remain consistent after persistence and identity hardening.
- [x] Explicitly avoid introducing new duplicate cart state containers (do not route new behavior through legacy `lib/store.tsx`).

- [x] Add regression tests for cart behavior and persistence (AC: 1, 2, 3, 4)
- [x] Add cart store tests for add/update/remove and deterministic totals.
- [x] Add persistence tests for rehydrate, malformed payload fallback, and auth-boundary continuity behavior.
- [x] Add quantity-boundary tests (cannot drop below 1 by decrement, cannot exceed 100 by increment).
- [x] Validate checkout payload mapping remains consistent with `services/order.service.ts` and `app/api/orders/route.ts`.

## Dev Notes

- Epic context:
- Story 3.1 starts Epic 3 and is the foundation for 3.2 checkout submission. Cart invariants must be stable before payment/order lifecycle work.

- Architecture guardrails:
- Preserve layering and boundaries: UI -> hooks/context -> services -> API routes -> Prisma/domain utilities.
- Keep API envelope conventions unchanged (`{ success, data?, error? }`); Story 3.1 should not introduce incompatible payload drift for order creation.
- Keep transactional integrity concerns delegated to order/payment stories; this story focuses on cart correctness and continuity.

- Cross-story dependency notes:
- Story 3.2 expects cart payload and totals to be trustworthy at checkout submission.
- Story 3.3/3.4 depend on stable order inputs from the checkout path that consumes this cart state.

- Previous implementation intelligence:
- Story 2.4 reinforced strict API contract consistency and deterministic error handling; keep this discipline when touching checkout/order-adjacent code paths.
- Recent commits show preference for test-backed route/service hardening before merging behavior changes.

- Current branch intelligence:
- Active cart source of truth is `lib/cart-store.tsx` (provided globally in `app/layout.tsx`).
- Legacy `lib/store.tsx` contains overlapping cart logic; do not reintroduce or extend it for new cart behavior.
- Current cart state is in-memory only; persistence across refresh/auth boundary is not yet enforced and is the main implementation gap for this story.

### Project Structure Notes

- Primary touch points:
- `lib/cart-store.tsx`
- `app/layout.tsx`
- `components/screens/CartScreen.tsx`
- `components/screens/CheckoutInfoScreen.tsx`
- `components/screens/CheckoutPaymentScreen.tsx`
- `components/screens/ProductCard.tsx`
- `components/screens/ProductDetailScreen.tsx`
- `components/screens/BestSellersSection.tsx`
- `components/screens/RelatedProducts.tsx`
- `components/ui-custom/ChatbotBubble.tsx`
- `components/web/navbar.tsx`
- `services/order.service.ts`
- `app/api/orders/route.ts`
- `tests/cart/**` (new)

### Testing Requirements

- Cart domain behavior:
- Add/update/remove actions recalculate totals and quantities deterministically.
- Aggregation behavior for repeated product/variant adds is stable and test-covered.

- Persistence behavior:
- Refresh rehydrates cart and checkout info consistently.
- Invalid persisted payloads do not crash UI and are safely discarded/reset.
- Auth-boundary transition behavior is explicit, deterministic, and test-covered.

- Checkout compatibility:
- Existing checkout screens still consume cart shape without runtime regressions.
- Order payload produced from cart items remains compatible with `CreateOrderPayload`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-31-Cart-Management]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Cart-Checkout--Order-Lifecycle]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/2-4-cms-and-blog-content-consumption.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first ready-for-dev story from sprint status: `3-1-cart-management`.
- Loaded DS workflow context and implemented changes mapped to story tasks only.
- Added `lib/cart-utils.ts` for deterministic cart keys, quantity clamping, merge logic, and storage read/write normalization.
- Refactored `lib/cart-store.tsx` to:
  - derive deterministic item IDs by identity fields
  - enforce quantity boundaries on update
  - persist/re-hydrate cart + checkout info in localStorage
  - merge guest cart into user cart at auth boundary with deterministic precedence
- Updated cart producer call sites to pass stable IDs (removed timestamp-based IDs).
- Validation commands executed:
  - `npx tsx --test tests/cart/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts` (run twice, final pass after refactor)
  - `npm run lint` (final: pass with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Implemented deterministic cart line-item identity based on `productId + variant/options`.
- Enforced cart quantity boundaries (`min=1`, `max=100`) for update flow.
- Added resilient localStorage persistence + hydration for cart and checkout info.
- Implemented guest-to-user auth-boundary merge behavior without silent cart loss.
- Added regression tests for identity merge, malformed payload fallback, quantity boundaries, and persistence round-trip.
- Preserved checkout/order payload compatibility by keeping cart item contract consumed by checkout screens and `orderService`.

### File List

- _bmad-output/implementation-artifacts/3-1-cart-management.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- lib/cart-utils.ts
- lib/cart-store.tsx
- components/screens/ProductCard.tsx
- components/screens/ProductDetailScreen.tsx
- components/screens/BestSellersSection.tsx
- components/screens/RelatedProducts.tsx
- components/ui-custom/ChatbotBubble.tsx
- tests/cart/cart-utils.test.ts

## Change Log

- 2026-04-05: Implemented Story 3.1 cart identity hardening, persistence/rehydration, auth-boundary merge behavior, and cart regression tests.
