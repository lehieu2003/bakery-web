# Bugfix Batch: Chatbot Redis Hang + Checkout Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 4 bugs found during the browser test round: (1) chatbot hangs forever when Redis is unreachable, (2) COD payment copy ignores the fulfillment method, (3) checkout name/phone stay empty when auth resolves after mount, (4) "(1 reviews)" grammar.

**Architecture:** One real design decision (bug 1): `lib/redis.ts` gives node-redis v6 a bounded reconnect strategy (3 tries, ~700ms) plus a 60s failure cooldown so an unreachable Redis resolves to `null` fast instead of hanging callers; the chat route's existing `null` path (skip cache) then works as its unit tests always assumed. Bugs 2–4 are localized UI fixes with component tests.

**Tech Stack:** node-redis ^6.1.0 (`reconnectStrategy` returning `false` stops retrying and rejects `connect()`), node:test (route/lib tests), vitest + Testing Library (component tests), pnpm.

**Spec:** Bounded batch per the 2026-09-30 brainstorm in chat (user approved approach A + 4-bug scope). Builds on the storefront-completion branch already merged to master (HEAD `1f0c3ef` at plan time).

## Global Constraints

- Package manager is pnpm; all `npm run *` scripts run via pnpm.
- Gates before every commit: `pnpm run test:node` (354+ green), `pnpm run test:vitest` (only the 4 KNOWN pre-existing failures in `tests/vitest/membership-benefit-visibility.test.tsx` ×3 and `tests/vitest/personalized-suggestions-section.test.tsx` ×1), `npx tsc --noEmit` clean.
- Conventional Commits on master, one commit per task; never `git add -A` (the pnpm lockfile drift and `.vscode/settings.json` deletion in the working tree belong to the user and must stay out).
- Route tests use `node:test` + `node:assert/strict` with real handlers and injected deps; component tests follow the `tests/vitest/membership-benefit-visibility.test.tsx` mock style.
- No schema changes; no new dependencies.

## Review Focus

The five inputs most likely to bite, each pinned by a test in the named task:

1. **Redis comes back after a cooldown** — a deployment where Redis starts 5 minutes after the app must recover caching without a restart; the cooldown path must retry after expiry, not lock out forever (Task 1).
2. **`reconnectStrategy` must actually stop the hang** — returning `false` must make `connect()` reject (v6 semantics), not silently keep retrying; pinned by a real-socket test against a closed port with a 2s bound (Task 1).
3. **Prefill must never overwrite a typed value** — if the user starts typing before auth resolves, the arriving `user` must not clobber it; pinned by component test (Task 3).
4. **COD label reacts live to method switches** — toggling Store Pick-up ↔ Delivery must flip the label immediately, not only on remount (Task 2).
5. **Pluralization in both render sites** — header stats row AND reviews section must agree ("(1 review)" and "(2 reviews)") (Task 4).

---

### Task 1: Bounded Redis reconnect + cooldown (fixes the chatbot hang)

**Files:**
- Modify: `lib/redis.ts`
- Test: `tests/redis-client.test.ts` (new)

**Interfaces:**
- Consumes: `redis` v6 `createClient`.
- Produces: `getRedisClient(): Promise<RedisClientType | null>` (signature unchanged — callers unaffected); new exported test helper `__resetRedisStateForTests(): void` (clears the cached promise + cooldown timestamp); new exported const `REDIS_FAILURE_COOLDOWN_MS = 60_000`.
- Behavior contract: with an unreachable `REDIS_URL`, `getRedisClient()` resolves `null` within ~2s (bounded retries), returns `null` instantly on calls within 60s of a failure, and retries again after the cooldown expires.

- [ ] **Step 1: Write the failing tests** in `tests/redis-client.test.ts`

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

test('getRedisClient resolves null within 2s when Redis is unreachable', async () => {
  process.env.REDIS_URL = 'redis://127.0.0.1:59999'; // closed port, nothing listens
  const { getRedisClient, __resetRedisStateForTests } = await import('@/lib/redis');
  __resetRedisStateForTests();
  const started = Date.now();
  const client = await Promise.race([
    getRedisClient(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('getRedisClient hung')), 2000),
    ),
  ]);
  assert.equal(client, null);
  assert.ok(Date.now() - started < 2000);
});

test('calls within the cooldown window return null instantly', async () => {
  process.env.REDIS_URL = 'redis://127.0.0.1:59999';
  const { getRedisClient, __resetRedisStateForTests, REDIS_FAILURE_COOLDOWN_MS } =
    await import('@/lib/redis');
  __resetRedisStateForTests();
  await getRedisClient(); // first call fails, starts cooldown
  const started = Date.now();
  const second = await getRedisClient();
  assert.equal(second, null);
  assert.ok(Date.now() - started < 100, 'cooldown hit must not reconnect');
  assert.ok(REDIS_FAILURE_COOLDOWN_MS >= 30_000);
});

test('no REDIS_URL resolves null immediately', async () => {
  delete process.env.REDIS_URL;
  const { getRedisClient, __resetRedisStateForTests } = await import('@/lib/redis');
  __resetRedisStateForTests();
  assert.equal(await getRedisClient(), null);
});
```

Note: the dynamic import per test re-reads module state via the reset helper, not via fresh module instances (same module registry across tests in one file). `__resetRedisStateForTests` must clear both the cached promise and the failure timestamp.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm run test:node -- tests/redis-client.test.ts`
Expected: FAIL — test 1 times out at the 2s race (`getRedisClient hung`) because the current client retries indefinitely; tests 2–3 fail on missing exports (`__resetRedisStateForTests`, `REDIS_FAILURE_COOLDOWN_MS`).

- [ ] **Step 3: Implement in `lib/redis.ts`**

- `createClient({ url, socket: { connectTimeout: 2000, reconnectStrategy: (retries) => (retries < 3 ? Math.min(100 * 2 ** retries, 400) : false) } })` — v6: returning `false` stops reconnection and rejects `connect()`.
- Module state: `let lastFailureAt: number | null = null;` alongside the existing promise cache.
- `getRedisClient()`: if `lastFailureAt && Date.now() - lastFailureAt < REDIS_FAILURE_COOLDOWN_MS` → return `null` immediately (before touching the promise).
- On connect failure (existing `.catch`): set `lastFailureAt = Date.now()`, reset `redisClientPromise = null`, return `null` (keep existing logging).
- On successful connect: clear `lastFailureAt = null` so a recovered Redis is used again.
- Export `REDIS_FAILURE_COOLDOWN_MS = 60_000` and `__resetRedisStateForTests()` (resets `redisClientPromise` and `lastFailureAt`).
- Do not change the exported `getRedisUrl`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm run test:node -- tests/redis-client.test.ts && pnpm run test:node && npx tsc --noEmit`
Expected: new file 3/3 PASS; full node suite green; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add lib/redis.ts tests/redis-client.test.ts
git commit -m "fix(chat): bound redis reconnect and add failure cooldown so chat responds without redis"
```

---

### Task 2: COD copy follows the fulfillment method

**Files:**
- Modify: `components/screens/CheckoutPaymentScreen.tsx`
- Modify: the success screen that renders "Pay on delivery" (locate with `grep -rn "Pay on delivery" components/ app/` — pin the exact file in the commit)
- Test: `tests/vitest/checkout-payment-cod-label.test.tsx` (new)

**Interfaces:**
- Consumes: `useCart()` checkout info `method: 'pickup' | 'delivery'` (same source Task 7 used for `deliveryMethod`).
- Produces: COD entry label/desc by method — pickup: "Cash on Pickup" / "Pay at the counter when you collect your order"; delivery: "Cash on Delivery" / "Pay in cash when your order arrives". Success page mirrors: pickup → "Pay at pickup", delivery → "Pay on delivery". Other methods (MOMO/VNPAY/BANK_TRANSFER) unchanged.

- [ ] **Step 1: Write the failing test** in `tests/vitest/checkout-payment-cod-label.test.tsx`

Render `CheckoutPaymentScreen` twice (mock style of `tests/vitest/membership-benefit-visibility.test.tsx`; mock `@/lib/cart-store` checkout info `{ method: 'delivery' }` then `{ method: 'pickup' }`, other hooks per that file's pattern):
- delivery render → `screen.getByText('Cash on Delivery')` present, `queryByText('Cash on Pickup')` null.
- pickup render → `screen.getByText('Cash on Pickup')` present.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:vitest -- checkout-payment-cod-label`
Expected: FAIL — delivery render still shows "Cash on Pickup".

- [ ] **Step 3: Implement** — replace the static COD `label`/`desc` with method-derived values at render time (the PAYMENT_METHODS array stays static for the other 3 methods; derive COD's label from `checkoutInfo?.method === 'delivery'`). Apply the same method mapping to the success page's payment label found in Step 0's grep.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm run test:vitest && npx tsc --noEmit`
Expected: new test 2/2 PASS; only the 4 known failures; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add components/screens/CheckoutPaymentScreen.tsx <success-file> tests/vitest/checkout-payment-cod-label.test.tsx
git commit -m "fix(checkout): derive COD copy from fulfillment method instead of static pickup wording"
```

---

### Task 3: Checkout prefill syncs when auth resolves

**Files:**
- Modify: `components/screens/CheckoutInfoScreen.tsx`
- Test: extend `tests/vitest/checkout-address-picker.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` `user` (`{ name?, phone? }`) — already in scope of the screen.
- Produces: behavior contract — when the checkout draft has no `customerName`/`customerPhone` and the fields are empty, they prefill from `user.name`/`user.phone` as soon as `user` arrives, even on a direct page load; a value the user (or draft) already set is never overwritten.

- [ ] **Step 1: Write the failing test** (append to `tests/vitest/checkout-address-picker.test.tsx`)

Render `CheckoutInfoScreen` with the auth mock returning `{ user: null }` on first render, then `rerender` with `{ user: { name: 'Linh Nguyen', phone: '0901234567', ... } }` and `isAuthenticated: true`. Assert after rerender: name textbox value `'Linh Nguyen'`, phone textbox value `'0901234567'`. Second case: pre-type a name before the rerender → assert the typed value survives.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:vitest -- checkout-address-picker`
Expected: FAIL — after rerender the fields stay empty (one-shot `useState` initializer at lines 326–328).

- [ ] **Step 3: Implement** — add a `useEffect` keyed on `[user, checkoutInfo]`: if `user` exists and the current `name` state is empty and `checkoutInfo?.customerName` is absent → `setName(user.name ?? '')`; same for `phone` from `user.phone`. Do not touch fields that already have values. (Note: `phone` today never prefills from the user — this fixes that too.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm run test:vitest && pnpm run test:node && npx tsc --noEmit`
Expected: PASS (new cases green, existing checkout-address-picker cases green).

- [ ] **Step 5: Commit**

```bash
git add components/screens/CheckoutInfoScreen.tsx tests/vitest/checkout-address-picker.test.tsx
git commit -m "fix(checkout): prefill contact fields from profile when auth resolves after mount"
```

---

### Task 4: Review count pluralization

**Files:**
- Modify: `components/screens/ProductDetailScreen.tsx:373`, `components/web/product-reviews.tsx:101`
- Test: extend `tests/vitest/product-reviews-section.test.tsx`

**Interfaces:** `reviewCount: number` render helper — `({count} ${count === 1 ? 'review' : 'reviews'})`; used in both render sites so they never disagree.

- [ ] **Step 1: Write the failing test** (append to `tests/vitest/product-reviews-section.test.tsx`)

Render `ProductReviewsSection` with `reviewCount={1}` → `screen.getByText('(1 review)')` present (exact, no "s"). The existing `reviewCount={3}` case already pins the plural.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:vitest -- product-reviews-section`
Expected: FAIL — currently renders "(1 reviews)".

- [ ] **Step 3: Implement** in both files: replace the hardcoded `reviews` suffix with the conditional per Interfaces.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm run test:vitest && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/screens/ProductDetailScreen.tsx components/web/product-reviews.tsx tests/vitest/product-reviews-section.test.tsx
git commit -m "fix(reviews): singular '(1 review)' label"
```

---

## Out of scope (deferred — same reasoning as the 2026-09-29 plan)

Fast-follow queue (Place Order gate on preview failure, addressId staleness guard, review pager, pickupDate formatting, `addressToOneLine` dedupe, radiogroup keyboard support, negative-path checkout tests), Points History real API, and the chatbot Redis **in-memory fallback** (approach B — revisit if the 60s cooldown proves annoying in dev).
