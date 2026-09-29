# Storefront Commerce Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the e-commerce features whose database models already exist but have no working code path: product Reviews, customer Addresses, order checkout fidelity (variant / cake message / pickup date / saved address), and the delivery fee that admins can already configure but that is hardcoded to 0 at order creation.

**Architecture:** All four features follow the codebase's existing conventions: Next.js App Router route handlers that export a testable `handleXxxRequest(request, params, deps)` function with injected dependencies, `{ success, data }` response envelopes, frontend `services/*.service.ts` HTTP clients over `lib/api/endpoints.ts`, TanStack Query hooks in `hooks/use-*.ts`, and `node:test` route tests that import the handler directly with fake deps. No new subsystems are introduced; every task wires an existing Prisma model (`Review`, `Address`, `ProductVariant`, `Setting`) into the running flow.

**Tech Stack:** Next.js (App Router) + TypeScript strict + Prisma/PostgreSQL + TanStack Query + Tailwind; tests via `tsx --test` (route/service) and vitest + Testing Library (jsdom components).

**Spec:** This plan implements the highest-priority gaps found in the 2026-09-29 full-codebase scan. The original feature intent (server-side cart, addresses, reviews, coupons) is documented in `bakery-web/plan.md` Phases 5–7; this plan covers the subset that unblocks customers today and deliberately defers server-side cart, coupon admin CRUD, blog comments, and infra hardening (see "Deferred gaps" at the bottom).

## Global Constraints

- Every route handler exports its logic as `handleXxxRequest(request, params, deps)` and a thin Next.js `GET`/`POST`/`PUT`/`DELETE` wrapper that supplies real deps — this is how `app/api/orders/route.ts`, `app/api/public/products/best-sellers/route.ts`, and all 35 admin routes are built and tested.
- Response envelope everywhere: success `{ success: true, data: {...} }`, failure `{ success: false, error: string }` with the HTTP status in the response only (no thrown errors past the handler boundary).
- Route tests use `node:test` + `node:assert/strict`, import the handler from `@/app/api/...`, and pass fake `deps` — never a real database. Run with `npm run test:node`. Component tests live in `tests/vitest/*.test.tsx` and run with `npm run test:vitest`.
- Auth guard: customer endpoints use `requireUserFromRequest(request)` from `@/lib/rbac`; error mapping follows the `app/api/wishlist/route.ts` catch pattern (`mapAuthErrorToStatus(message)`, non-500 statuses returned to the client, 500 logged with `console.error`).
- TypeScript is strict. There is no typecheck script — run `npx tsc --noEmit` as the verification gate alongside tests.
- Prisma schema changes go through a migration: `npx prisma migrate dev --name <name>`. Do not use `db push`.
- All money math stays in integer VND (the codebase stores `Decimal(10,2)` but passes plain numbers through `asNumber`); new fields follow the same convention.
- New storefront UI copy matches the language of the host screen (checkout screens are English; product detail mixes Vietnamese and English).
- Commits: Conventional Commits (`feat:`, `fix:`, `test:`) inside the `bakery-web` git repository, one commit per task.
- Every task ends with: `npm run test:node`, `npm run test:vitest`, and `npx tsc --noEmit` all passing, before its commit step.

## Review Focus

The five inputs most likely to bite a real customer that no single task's happy-path test covers. Each has a pinning test in the task named in parentheses.

1. **A guest (no session) hits a customer-only endpoint** — POST review, POST/PUT/DELETE address, or order create with `addressId` must return 401/400 and must never create or read a row (Task 1, Task 4, Task 6).
2. **A `variantId` that belongs to a different product** is submitted with an order item — the API must reject with 400 and must never attach the variant or use its price (Task 6).
3. **An address id owned by another user** is used for PUT/DELETE or sent as order `addressId` — must 404/400 and never leak address contents into an order snapshot (Task 4, Task 6).
4. **Only one default address per user** — creating/updating an address with `isDefault: true` must leave every other address `isDefault: false` (Task 4).
5. **A review comment containing HTML/script tags** — must render as inert text in the UI (React text nodes only, no `dangerouslySetInnerHTML`) (Task 3).

---

### Task 1: Product Reviews API (GET list + POST create-or-update)

**Files:**
- Create: `app/api/products/[id]/reviews/route.ts`
- Modify: `lib/api/endpoints.ts` (add `REVIEWS` entry)
- Test: `tests/products/product-reviews-route.test.ts`

**Interfaces:**
- Consumes: `requireUserFromRequest`, `AuthError`, `mapAuthErrorToStatus` from `@/lib/rbac`; `prisma` from `@/lib/prisma`; `Review`, `CreateReviewRequest` types from `@/types/api.types` (already exist).
- Produces: endpoints `ENDPOINTS.REVIEWS.LIST(productId) => '/api/products/{productId}/reviews'`; handler deps type `ReviewsRouteDeps`; POST response `{ success: true, data: { review } }` where `review` matches the existing `Review` type including `user: { id, name }`.

- [ ] **Step 1: Write the failing tests** in `tests/products/product-reviews-route.test.ts`

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleListReviewsRequest,
  handleCreateReviewRequest,
  type ReviewsRouteDeps,
} from '@/app/api/products/[id]/reviews/route';

function createDeps(overrides: Partial<ReviewsRouteDeps> = {}): ReviewsRouteDeps {
  return {
    requireUser: async () => ({ id: 'u1' }),
    findActiveProduct: async (productId) =>
      productId === 'p1' ? { id: 'p1' } : null,
    listReviews: async () => ({
      reviews: [
        {
          id: 'r1', userId: 'u1', productId: 'p1', rating: 5,
          comment: 'Great banh mi', createdAt: new Date('2026-09-01'),
          user: { id: 'u1', name: 'Lan' },
        },
      ],
      total: 1,
    }),
    upsertReview: async (input) => ({
      id: 'r1', userId: input.userId, productId: input.productId,
      rating: input.rating, comment: input.comment,
      createdAt: new Date('2026-09-01'),
      user: { id: 'u1', name: 'Lan' },
    }),
    ...overrides,
  };
}

test('POST review requires an authenticated user', async () => {
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 5 }) },
    { id: 'p1' },
    createDeps({ requireUser: async () => { throw new Error('unauthorized'); } }),
  );
  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
});

test('POST review rejects rating outside 1-5', async () => {
  for (const rating of [0, 6, 2.5, 'x']) {
    const result = await handleCreateReviewRequest(
      { json: async () => ({ rating }) }, { id: 'p1' }, createDeps(),
    );
    assert.equal(result.status, 400);
  }
});

test('POST review rejects comment longer than 2000 chars', async () => {
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 4, comment: 'a'.repeat(2001) }) },
    { id: 'p1' }, createDeps(),
  );
  assert.equal(result.status, 400);
});

test('POST review 404s for unknown or inactive product', async () => {
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 4 }) }, { id: 'nope' }, createDeps(),
  );
  assert.equal(result.status, 404);
});

test('POST review upserts one review per user per product', async () => {
  let calls = 0;
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 4, comment: '  Yummy  ' }) },
    { id: 'p1' },
    createDeps({
      upsertReview: async (input) => {
        calls += 1;
        assert.equal(input.comment, 'Yummy'); // trimmed
        return {
          id: 'r1', userId: 'u1', productId: 'p1', rating: 4,
          comment: 'Yummy', createdAt: new Date(),
          user: { id: 'u1', name: 'Lan' },
        };
      },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.equal(result.body.data.review.rating, 4);
});

test('GET reviews returns envelope with pagination and clamps limit', async () => {
  const result = await handleListReviewsRequest(
    'http://localhost/api/products/p1/reviews?page=0&limit=999',
    { id: 'p1' }, createDeps(),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.data.pagination.page, 1);
  assert.equal(result.body.data.pagination.limit, 50); // clamped
  assert.equal(result.body.data.reviews[0].user.name, 'Lan');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:node -- tests/products/product-reviews-route.test.ts`
Expected: FAIL — module `@/app/api/products/[id]/reviews/route` does not exist.

- [ ] **Step 3: Implement the route** in `app/api/products/[id]/reviews/route.ts`

Export `type ReviewsRouteDeps` exactly as the test uses it (`requireUser`, `findActiveProduct`, `listReviews`, `upsertReview`). GET is public; POST requires a user. Default deps use `prisma.review.upsert` keyed on `userId_productId` (the `@@unique([userId, productId])` already in the schema makes resubmission an update, never a duplicate row), `prisma.product.findFirst({ where: { id, isActive: true }, select: { id: true } })`, and `prisma.review.findMany` with `include: { user: { select: { id: true, name: true } } }`, `orderBy: { createdAt: 'desc' }`, plus a `prisma.review.count` for `total`. Pagination: `page` defaults 1 (min 1), `limit` defaults 10 (clamped 1–50). Validation: `rating` must be a number with `Number.isInteger(rating) && rating >= 1 && rating <= 5`; `comment` optional, `String` trimmed, empty → `null`, max 2000 chars. The Next.js wrappers follow the `params` handling already used in `app/api/public/products/[id]/route.ts`. Error handling mirrors `app/api/wishlist/route.ts` (mapAuthErrorToStatus pattern).

- [ ] **Step 4: Add the endpoint entry** to `lib/api/endpoints.ts`

```ts
REVIEWS: {
  LIST: (productId: string) => `${API_BASE}/products/${productId}/reviews`,
},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:node -- tests/products/product-reviews-route.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/products/\[id\]/reviews tests/products/product-reviews-route.test.ts lib/api/endpoints.ts
git commit -m "feat(reviews): add product reviews list and submit API"
```

---

### Task 2: Real rating stats on the public product detail API

**Files:**
- Modify: `app/api/public/products/[id]/route.ts` (wrap the existing GET body in `handleGetPublicProductRequest(request, params, deps)`, add review count/average)
- Modify: `types/api.types.ts` — `Product` interface gains `reviews?: Review[]`, `reviewCount?: number`, `ratingAverage?: number | null`
- Test: `tests/products/public-product-detail-route.test.ts` (new file)

**Interfaces:**
- Consumes: existing detail query in that route (already includes `reviews: { include: { user: ... }, take: 10 }`).
- Produces: `product.reviewCount: number` and `product.ratingAverage: number | null` (average rounded to 1 decimal) in the GET response — Task 3's UI reads these; handler exports `PublicProductDetailDeps` with `findProductDetail(idOrSlug)` and `getReviewStats(productId)`.

- [ ] **Step 1: Write the failing tests** in `tests/products/public-product-detail-route.test.ts`

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetPublicProductRequest,
  type PublicProductDetailDeps,
} from '@/app/api/public/products/[id]/route';

function createDeps(overrides: Partial<PublicProductDetailDeps> = {}): PublicProductDetailDeps {
  return {
    findProductDetail: async () => ({
      id: 'p1', name: 'Banh mi', price: 25000,
      reviews: [{ rating: 5, comment: 'ngon', createdAt: new Date(), user: { id: 'u1', name: 'Lan' } }],
    }),
    getReviewStats: async () => ({ total: 128, average: 4.25 }),
    ...overrides,
  };
}

test('GET product detail returns reviewCount and rounded ratingAverage', async () => {
  const result = await handleGetPublicProductRequest(
    'http://localhost/api/public/products/p1', { id: 'p1' }, createDeps(),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.data.product.reviewCount, 128);
  assert.equal(result.body.data.product.ratingAverage, 4.3); // Math.round(4.25 * 10) / 10
  assert.equal(result.body.data.product.reviews.length, 1);
});

test('GET product detail 404s when product is missing', async () => {
  const result = await handleGetPublicProductRequest(
    'http://localhost/api/public/products/nope', { id: 'nope' },
    createDeps({ findProductDetail: async () => null }),
  );
  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('ratingAverage is null when the product has no reviews', async () => {
  const result = await handleGetPublicProductRequest(
    'http://localhost/api/public/products/p1', { id: 'p1' },
    createDeps({ getReviewStats: async () => ({ total: 0, average: null }) }),
  );
  assert.equal(result.body.data.product.reviewCount, 0);
  assert.equal(result.body.data.product.ratingAverage, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:node -- tests/products/public-product-detail-route.test.ts`
Expected: FAIL — `handleGetPublicProductRequest` is not exported.

- [ ] **Step 3: Implement** — refactor the route body into `handleGetPublicProductRequest(request, params: { id: string }, deps: PublicProductDetailDeps)`; default deps keep the existing Prisma query (add `_count: { select: { reviews: true } }` to its `include`) and add `getReviewStats` via `prisma.review.aggregate({ where: { productId: id }, _count: true, _avg: { rating: true } })` returning `{ total, average }` (`average = _avg.rating == null ? null : Number(_avg.rating)`). Attach `reviewCount` / `ratingAverage` to the response product.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:node -- tests/products/public-product-detail-route.test.ts && npm run test:node && npx tsc --noEmit`
Expected: PASS — including the full existing suite (the refactor must not break any current route behavior).

- [ ] **Step 5: Commit**

```bash
git add "app/api/public/products/[id]/route.ts" tests/products/public-product-detail-route.test.ts types/api.types.ts
git commit -m "feat(products): expose review count and average rating on product detail"
```

---

### Task 3: Real reviews UI on the product detail page

**Files:**
- Create: `components/web/product-reviews.tsx` (new `ProductReviewsSection` component)
- Create: `services/review.service.ts`
- Create: `hooks/use-reviews.ts`
- Modify: `components/screens/ProductDetailScreen.tsx` — replace the hardcoded stars/`(128 reviews)` block (~lines 358–371) with real stats, and render `ProductReviewsSection` under the product description
- Test: `tests/vitest/product-reviews-section.test.tsx`

**Interfaces:**
- Consumes: `ENDPOINTS.REVIEWS.LIST` (Task 1), `productKeys.detail(idOrSlug)` from `@/hooks/use-products` (for cache invalidation), `useAuth().isAuthenticated` from `@/providers/auth-provider`, `product.reviewCount` / `product.ratingAverage` / `product.reviews` (Task 2).
- Produces: `reviewService.getProductReviews(productId, page?) => Promise<{ reviews: Review[]; pagination }>` and `reviewService.submitReview(productId, input: CreateReviewRequest) => Promise<Review>`; hooks `useProductReviews(productId, { enabled })` and `useSubmitReview(productId)`; component `ProductReviewsSection({ productId, reviewCount, ratingAverage })` (fetches its own list via `useProductReviews`).

- [ ] **Step 1: Write the failing component test** in `tests/vitest/product-reviews-section.test.tsx`

Follow the mock style of `tests/vitest/membership-benefit-visibility.test.tsx` (`vi.mock` for `@/hooks/use-reviews`, `@/providers/auth-provider`). Render `<ProductReviewsSection productId='p1' reviewCount={3} ratingAverage={4} />` with `useProductReviews` returning 3 reviews, one of them `comment: '<script>alert(1)</script>'` and `user: { id: 'u1', name: 'Lan' }`. Assert:

```tsx
expect(screen.getAllByText('★').length).toBeGreaterThanOrEqual(1);
expect(screen.getByText('(3 reviews)')).toBeInTheDocument();
expect(screen.getByText(/ngon/)).toBeInTheDocument();
// XSS pin: script markup must be inert text, not injected
expect(screen.getByText('<script>alert(1)</script>').tagName).toBe('P');
```

Also render with `reviewCount={0}` and assert the stats row is absent (`queryByText(/reviews/)` null). For the authenticated submit flow: mock `useSubmitReview` to return a `mutateAsync` spy; click the 4th star button and the submit button; assert `mutateAsync` called with `{ rating: 4, comment: 'test' }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:vitest -- product-reviews-section`
Expected: FAIL — `ProductReviewsSection` does not exist.

- [ ] **Step 3: Implement the service and hook** in `services/review.service.ts` and `hooks/use-reviews.ts`

The service mirrors `services/wishlist.service.ts` (`http.get` / `http.post` with `showErrorToast: false, skipAuthRedirect: true`). `useSubmitReview` invalidates both `reviewsKeys.product(productId)` and `productKeys.detail(productId)` (import `productKeys` from `@/hooks/use-products`) so the stats refresh.

- [ ] **Step 4: Implement `ProductReviewsSection`** in `components/web/product-reviews.tsx`

Structure: stats row (stars from `Math.round(ratingAverage)`, `(N reviews)` — omit both when `reviewCount === 0`), the review list (avatar circle with name initial, name fallback `'Khách'`, `toLocaleDateString('vi-VN')` date, star row, comment in a `<p>` — text nodes only), and the form: authenticated users get 5 clickable star buttons + `maxLength={2000}` textarea + submit (disabled while pending); guests get a "Đăng nhập để đánh giá" link to `/auth?redirect=/products/{productId}`. 

- [ ] **Step 5: Wire into `ProductDetailScreen`** — replace the hardcoded block at ~lines 358–371 with real stats from `selectedProduct.reviewCount` / `selectedProduct.ratingAverage` and render `<ProductReviewsSection productId={selectedProduct.id} reviewCount={...} ratingAverage={...} />` after the description block. Delete the fake "(128 reviews)" literal and the fixed 4-star row.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test:vitest && npm run test:node && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/web/product-reviews.tsx services/review.service.ts hooks/use-reviews.ts components/screens/ProductDetailScreen.tsx tests/vitest/product-reviews-section.test.tsx
git commit -m "feat(reviews): real reviews and submit form on product detail"
```

---

### Task 4: Address book API

**Files:**
- Create: `app/api/addresses/route.ts` (GET list, POST create)
- Create: `app/api/addresses/[id]/route.ts` (PUT update, DELETE)
- Modify: `lib/api/endpoints.ts` (add `ADDRESSES`)
- Test: `tests/addresses/addresses-routes.test.ts`

**Interfaces:**
- Consumes: `requireUserFromRequest` / `mapAuthErrorToStatus` from `@/lib/rbac`; `Address`, `CreateAddressRequest`, `UpdateAddressRequest` from `@/types/api.types` (already exist, currently dead).
- Produces: `ENDPOINTS.ADDRESSES = { LIST: '/api/addresses', DETAIL: (id) => '/api/addresses/{id}' }`; responses `{ data: { addresses } }` / `{ data: { address } }` / `{ data: { deleted: true } }`; handler deps type `AddressesRouteDeps` shared by both route files.

- [ ] **Step 1: Write the failing tests** in `tests/addresses/addresses-routes.test.ts`

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleListAddressesRequest,
  handleCreateAddressRequest,
} from '@/app/api/addresses/route';
import {
  handleUpdateAddressRequest,
  handleDeleteAddressRequest,
} from '@/app/api/addresses/[id]/route';
import type { AddressesRouteDeps } from '@/app/api/addresses/route';

const ADDRESS = {
  fullName: 'Lan Nguyen', phone: '0909123456', province: 'TP.HCM',
  district: 'Quan 1', ward: 'P. Ben Nghe', street: '12 Nguyen Trai',
  isDefault: true,
};

function createDeps(overrides: Partial<AddressesRouteDeps> = {}): AddressesRouteDeps {
  return {
    requireUser: async () => ({ id: 'u1' }),
    listAddresses: async () => [],
    createAddress: async (input) => ({ id: 'a1', userId: 'u1', ...input, createdAt: new Date() }),
    countAddresses: async () => 0, // 0 = first address
    findOwnedAddress: async (_userId, id) => (id === 'a1' ? { id: 'a1', userId: 'u1', ...ADDRESS, isDefault: false, createdAt: new Date() } : null),
    updateAddress: async (id, input) => ({ id, userId: 'u1', ...ADDRESS, ...input, createdAt: new Date() }),
    unsetOtherDefaults: async () => {},
    deleteAddress: async () => {},
    ...overrides,
  };
}

test('address endpoints require a session', async () => {
  const noAuth = createDeps({ requireUser: async () => { throw new Error('unauthorized'); } });
  assert.equal((await handleListAddressesRequest({}, noAuth)).status, 401);
  assert.equal((await handleCreateAddressRequest({ json: async () => ADDRESS }, noAuth)).status, 401);
});

test('POST rejects missing required fields', async () => {
  const { fullName, ...incomplete } = ADDRESS;
  const result = await handleCreateAddressRequest({ json: async () => incomplete }, createDeps());
  assert.equal(result.status, 400);
});

test('first address is forced to default', async () => {
  let defaultOnCreate = false;
  await handleCreateAddressRequest(
    { json: async () => ({ ...ADDRESS, isDefault: false }) },
    createDeps({ createAddress: async (input) => { defaultOnCreate = input.isDefault; return { id: 'a1', userId: 'u1', ...input, createdAt: new Date() }; } }),
  );
  assert.equal(defaultOnCreate, true);
});

test('creating a default address unsets the previous default', async () => {
  let unsetCalled = false;
  await handleCreateAddressRequest(
    { json: async () => ({ ...ADDRESS, isDefault: true }) },
    createDeps({ countAddresses: async () => 3, unsetOtherDefaults: async () => { unsetCalled = true; } }),
  );
  assert.equal(unsetCalled, true);
});

test('PUT/DELETE of another user\'s address return 404', async () => {
  const deps = createDeps({ findOwnedAddress: async () => null });
  assert.equal((await handleUpdateAddressRequest({ json: async () => ({ phone: '0912345678' }) }, { id: 'other' }, deps)).status, 404);
  assert.equal((await handleDeleteAddressRequest({}, { id: 'other' }, deps)).status, 404);
});

test('PUT with isDefault unsets other defaults', async () => {
  let unsetCalled = false;
  const result = await handleUpdateAddressRequest(
    { json: async () => ({ isDefault: true }) }, { id: 'a1' },
    createDeps({ unsetOtherDefaults: async () => { unsetCalled = true; } }),
  );
  assert.equal(result.status, 200);
  assert.equal(unsetCalled, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:node -- tests/addresses/addresses-routes.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement both routes**

`AddressesRouteDeps = { requireUser, listAddresses, createAddress, countAddresses, findOwnedAddress, updateAddress, unsetOtherDefaults, deleteAddress }` (signatures per the test). Default deps use `prisma.address` calls; `listAddresses` orders `[{ isDefault: 'desc' }, { createdAt: 'desc' }]`. Validation: all six text fields required, trimmed, 1–200 chars; phone must match `/^[0-9+\s.\-]{8,15}$/`; unknown extra fields ignored. Default-singleton invariant: if `isDefault === true` → `unsetOtherDefaults(userId, excludeId)` after the write; if this is the user's first address (`countAddresses === 0`) → force `isDefault: true`. Every Prisma read/write filters by `userId` (ownership), so cross-user access is a 404, never a leak. GET list and POST create live in `app/api/addresses/route.ts`; PUT and DELETE in `app/api/addresses/[id]/route.ts` (both export `handleXxxRequest(request, params, deps)` wrappers).

- [ ] **Step 4: Add endpoints** to `lib/api/endpoints.ts`

```ts
ADDRESSES: {
  LIST: `${API_BASE}/addresses`,
  DETAIL: (id: string) => `${API_BASE}/addresses/${id}`,
},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:node -- tests/addresses/addresses-routes.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/addresses tests/addresses lib/api/endpoints.ts
git commit -m "feat(addresses): address book CRUD API with single-default invariant"
```

---

### Task 5: Address book in the UI (checkout picker + profile management)

**Files:**
- Create: `services/address.service.ts`
- Create: `hooks/use-addresses.ts`
- Modify: `components/screens/CheckoutInfoScreen.tsx` — saved-address picker above the existing textarea
- Modify: `components/screens/ProfileScreen.tsx` — "Saved Addresses" section
- Test: `tests/vitest/checkout-address-picker.test.tsx`

**Interfaces:**
- Consumes: `ENDPOINTS.ADDRESSES` (Task 4), `useAuth().isAuthenticated`.
- Produces: `addressService.getMyAddresses() => Promise<Address[]>`, `createAddress(input: CreateAddressRequest) => Promise<Address>`, `updateAddress(id, input: UpdateAddressRequest)`, `deleteAddress(id)`; hooks `useAddresses({ enabled })` (query key root `['addresses']`), `useCreateAddress`, `useUpdateAddress`, `useDeleteAddress` (all mutations invalidate `['addresses']`).
- Checkout integration: selecting a saved address fills the existing `fullName`, `phone`, `address` state values in `CheckoutInfoScreen` (`address` = `${street}, ${ward}, ${district}, ${province}`) — the downstream payment step and order payload keep working unchanged.

- [ ] **Step 1: Write the failing component test** in `tests/vitest/checkout-address-picker.test.tsx`

Mock `@/hooks/use-addresses`, `@/providers/auth-provider` (authenticated), `next/navigation`, `next/image`. Render `CheckoutInfoScreen` with `useAddresses` returning one address `{ id: 'a1', fullName: 'Lan Nguyen', phone: '0909123456', street: '12 Nguyen Trai', ward: 'P. Ben Nghe', district: 'Quan 1', province: 'TP.HCM', isDefault: true }`. Assert: the address is rendered as a selectable card showing "Lan Nguyen" and "0909123456"; clicking it fills the address textarea with `12 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM`. Second render with `useAddresses` returning `[]` and guest auth: the textarea is the only address UI (no picker).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:vitest -- checkout-address-picker`
Expected: FAIL.

- [ ] **Step 3: Implement service + hooks** (mirror `services/wishlist.service.ts` / `hooks/use-wishlist.ts`; `http.delete` for `deleteAddress` — no body needed).

- [ ] **Step 4: Implement the checkout picker** in `CheckoutInfoScreen.tsx`

When `isAuthenticated` and `addresses.length > 0`, render a radio-card list above the existing textarea (each card: fullName, phone, one-line address, "Default" badge when `isDefault`), plus a "Use a new address" option that reveals the existing free-text textarea. Selecting a card fills the existing `fullName` / `phone` / `address` states. Also add a "Save this address" checkbox + six structured inputs (fullName, phone, street, ward, district, province) shown with the new-address option when a picker exists — checking it calls `useCreateAddress` on valid submit (the structured `CreateAddressRequest`; `isDefault` omitted — server forces it for the first address). Guests and users with no saved addresses keep today's free-text flow unchanged.

- [ ] **Step 5: Implement the profile section** in `ProfileScreen.tsx`

New "Saved Addresses" card in the settings column: list (same card layout), per-address actions Edit (inline form reusing the six inputs, calls `useUpdateAddress`), Set as default, Delete (calls `useDeleteAddress`); "Add address" button opens the same six-input form. Hidden entirely for guests.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test:vitest && npm run test:node && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add services/address.service.ts hooks/use-addresses.ts components/screens/CheckoutInfoScreen.tsx components/screens/ProfileScreen.tsx tests/vitest/checkout-address-picker.test.tsx
git commit -m "feat(addresses): saved-address picker at checkout and profile address book"
```

---

### Task 6: Order fidelity — persist variant, cake message, pickup date, and saved address

**Files:**
- Modify: `prisma/schema.prisma` — `Order` gains `pickupDate DateTime?`; `OrderItem` gains `message String?`
- Create: `prisma/migrations/<timestamp>_add_order_fidelity_fields/migration.sql` (via `npx prisma migrate dev --name add_order_fidelity_fields`)
- Modify: `app/api/orders/route.ts` — extend `CreateOrderPayload`, re-pricing, persistence, presentation
- Modify: `types/api.types.ts` — `Order` gains `pickupDate?: string | null`; `OrderItem` gains `message?: string | null`
- Test: modify `tests/orders/orders-route.test.ts` (add cases)

**Interfaces:**
- Consumes: existing `handleCreateOrderRequest(payload, deps)` seams in `app/api/orders/route.ts`.
- Produces: `CreateOrderDeps` gains `findVariants(ids: string[]) => Promise<Array<{ id: string; productId: string; name: string; price: number }>>` and `findUserAddress(userId: string, addressId: string) => Promise<{ street: string; ward: string; district: string; province: string } | null>`; `createOrderWithItems` args gain `pickupDate: Date | null` and per-item `variantId: string | null; message: string | null`. Order GET responses expose `pickupDate` and per-item `message` (items already expose `variantId`).

- [ ] **Step 1: Write the failing tests** (append to `tests/orders/orders-route.test.ts`; extend the local `createDeps()` with the two new seams)

```ts
test('order item with variant uses the variant price and name', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    findVariants: async () => [{ id: 'v1', productId: 'p1', name: '500g', price: 120000 }],
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK260405ABCD', orderItems: [] }; },
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 2, variantId: 'v1' }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 200); // create returns 200, matching the existing route
  assert.equal(captured!.orderItems[0].price, 120000);
  assert.equal(captured!.orderItems[0].name, 'Cake A - 500g');
});

test('variantId from another product is rejected', async () => {
  const deps = withDeps(createDeps(), {
    findVariants: async () => [{ id: 'v9', productId: 'OTHER', name: 'X', price: 1 }],
  });
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 1, variantId: 'v9' }] };
  const result = await handleCreateOrderRequest(payload, deps);
  assert.equal(result.status, 400);
});

test('item message over 200 chars is rejected', async () => {
  const payload = { ...buildPayload('COD'),
    items: [{ productId: 'p1', name: 'Cake A', price: 100000, quantity: 1, message: 'a'.repeat(201) }] };
  const result = await handleCreateOrderRequest(payload, createDeps());
  assert.equal(result.status, 400);
});

test('guest cannot use addressId; address of another user is rejected', async () => {
  const guest = await handleCreateOrderRequest(
    { ...buildPayload('COD'), addressId: 'a1' }, createDeps());
  assert.equal(guest.status, 400);
  const other = await handleCreateOrderRequest(
    { ...buildPayload('COD'), addressId: 'a1' },
    withDeps(createDeps(), {
      getCurrentUser: async () => ({ id: 'u1' }),
      findUserAddress: async () => null,
    }));
  assert.equal(other.status, 400);
});

test('owned addressId snapshots into customerAddress and pickupDate is persisted', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getCurrentUser: async () => ({ id: 'u1' }),
    findUserAddress: async () => ({ street: '12 Nguyen Trai', ward: 'P. Ben Nghe', district: 'Quan 1', province: 'TP.HCM' }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK260405ABCD', orderItems: [] }; },
  });
  const result = await handleCreateOrderRequest(
    { ...buildPayload('COD'), addressId: 'a1', pickupDate: '2026-10-05' }, deps);
  assert.equal(result.status, 200);
  assert.equal(captured!.customerAddress, '12 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM');
  assert.equal(captured!.pickupDate!.getTime(), new Date('2026-10-05').getTime());
});
```

(`withDeps(base, overrides)` = `{ ...base, ...overrides }` helper; match the file's existing assertion style.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:node -- tests/orders/orders-route.test.ts`
Expected: FAIL — new fields are dropped/unknown, new deps missing.

- [ ] **Step 3: Apply the schema migration**

Run: `npx prisma migrate dev --name add_order_fidelity_fields`
Expected: migration applies cleanly; `npx prisma validate` passes.

- [ ] **Step 4: Implement in `app/api/orders/route.ts`**

- `CreateOrderPayload`: items gain `variantId?: string; message?: string`; top-level gains `pickupDate?: string; addressId?: string`.
- Validation: `message` trimmed, max 200 → 400; `pickupDate` must parse via `new Date(...)` and be valid → 400 otherwise; `addressId` requires an authenticated user (`userId === null` + `addressId` → 400) and `findUserAddress(userId, addressId)` must return a row → 400 `'Invalid address'` (ownership enforced by `userId` in the Prisma `where`).
- Re-pricing: after the existing product re-price, for each item with `variantId` look up `findVariants`; variant must exist and `variant.productId === item.productId` → else 400. Unit price = `variant.price`; `OrderItem.name = \`${product.name} - ${variant.name}\``.
- Persistence: `customerAddress` from the address snapshot when `addressId` given (existing free-text payload stays the fallback for guests); `createOrderWithItems` default impl writes `pickupDate` on the order and `variantId` / `message` on each item (the `OrderItem.variantId` column and relation already exist).
- Presentation: GET responses add `pickupDate` (ISO string, nullable) and per-item `message` (both orders list and reorder paths keep working — reorder already maps from order items by `productId`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:node && npx tsc --noEmit`
Expected: PASS — the entire suite, including contract tests (the payload change is additive).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations app/api/orders/route.ts types/api.types.ts tests/orders/orders-route.test.ts
git commit -m "feat(orders): persist variant, cake message, pickup date, and saved address on orders"
```

---

### Task 7: Frontend sends checkout fidelity fields and shows them in order history

**Files:**
- Modify: `services/order.service.ts` — `createOrder` input type and body
- Modify: `lib/cart-utils.ts` — `CheckoutInfo` gains `addressId?: string` (+ `normalizeCheckoutInfo` passes it through)
- Modify: `components/screens/CheckoutInfoScreen.tsx` — store the selected address id (from Task 5) into checkout info state
- Modify: `components/screens/CheckoutPaymentScreen.tsx` — map cart item `variantId` / `message` and order-level `pickupDate` / `addressId` into the create-order payload
- Modify: `components/screens/ProfileScreen.tsx` — order history cards render item lines, message, pickup date
- Test: `tests/vitest/checkout-order-fidelity.test.tsx`

**Interfaces:**
- Consumes: Task 6's API fields; cart items already carry `variantId`, `message`, `pickupDate` (`lib/cart-utils.ts` `CartFields`); Task 5's picker sets `addressId` in checkout info.
- Produces: `createOrder` payload items `{ productId, variantId?, message?, name, price, quantity }`, top-level `{ pickupDate?, addressId? }`; order history UI renders `order.orderItems[].name` / `message` and `order.pickupDate`.

- [ ] **Step 1: Write the failing test** in `tests/vitest/checkout-order-fidelity.test.tsx`

Render `CheckoutPaymentScreen` with mocked cart context (per `tests/vitest/membership-benefit-visibility.test.tsx` mocking style) where the cart contains one item `{ productId: 'p1', variantId: 'v1', message: 'Happy Birthday', pickupDate: '2026-10-05', quantity: 2, ... }` and checkout info `{ method: 'pickup', addressId: 'a1' }`. Mock `@/services/order.service` `createOrder` resolving `{ order: {...} }`. Submit and assert:

```tsx
expect(orderService.createOrder).toHaveBeenCalledWith(expect.objectContaining({
  addressId: 'a1',
  pickupDate: '2026-10-05',
  items: [expect.objectContaining({ productId: 'p1', variantId: 'v1', message: 'Happy Birthday' })],
}));
```

Also extend the ProfileScreen coverage: render an order with `orderItems: [{ name: 'Cake A - 500g', quantity: 2, message: 'Happy Birthday' }]` and `pickupDate: '2026-10-05'`; assert the card shows `'Cake A - 500g'`, `'Happy Birthday'`, and the pickup date.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:vitest -- checkout-order-fidelity`
Expected: FAIL — payload omits the new fields.

- [ ] **Step 3: Implement** — `order.service.ts` types extended as in Interfaces; `CheckoutPaymentScreen` builds `items` from the cart (forward `variantId` / `message` per item; when `method === 'pickup'` send `pickupDate` = the earliest parseable `pickupDate` among cart items, omit when none; forward `addressId` from checkout info). `CheckoutInfoScreen` writes `addressId` into checkout info on picker selection (Task 5) and clears it when "Use a new address" is chosen. ProfileScreen: inside each order history card render `order.orderItems` lines (`{name} × {quantity}`, message in italic when present) and the pickup date in the meta row when present.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:vitest && npm run test:node && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/order.service.ts lib/cart-utils.ts components/screens/CheckoutInfoScreen.tsx components/screens/CheckoutPaymentScreen.tsx components/screens/ProfileScreen.tsx tests/vitest/checkout-order-fidelity.test.tsx
git commit -m "feat(checkout): send variant, message, pickup date, and address id with orders"
```

---

### Task 8: Delivery fee comes from admin settings, not hardcoded zero

**Files:**
- Create: `lib/delivery-settings.ts`
- Modify: `app/api/orders/route.ts` — new dep + fee computation at the `deliveryFee: 0` site (line ~333)
- Test: modify `tests/orders/orders-route.test.ts` (add cases)

**Interfaces:**
- Consumes: `Setting` rows keyed `delivery_fee` (default `'30000'`) and `free_delivery_threshold` (default `'500000'`) — the same keys `app/api/admin/settings/route.ts` (`SETTINGS_KEYS.DELIVERY_FEE`, `SETTINGS_KEYS.FREE_DELIVERY_THRESHOLD`) already writes; settings-read pattern from `lib/membership/rules.ts` (`prisma.setting.findMany({ where: { key: { in: [...] } } })`).
- Produces: `getDeliverySettings(): Promise<DeliverySettings>` where `DeliverySettings = { deliveryFee: number; freeDeliveryThreshold: number }`; `CreateOrderDeps` gains `getDeliverySettings: () => Promise<DeliverySettings>`; created orders carry a real `deliveryFee`.

- [ ] **Step 1: Write the failing tests** (append to `tests/orders/orders-route.test.ts`)

```ts
test('delivery order under the threshold is charged the configured fee', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  await handleCreateOrderRequest(buildPayload('COD'), deps); // payload has customerAddress
  assert.equal(captured!.deliveryFee, 30000);
  assert.equal(captured!.total, captured!.subtotal + 30000);
});

test('delivery order at/above the threshold ships free', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  await handleCreateOrderRequest({ ...buildPayload('COD'), items: [{ productId: 'p1', name: 'Cake A', price: 500000, quantity: 1 }] }, deps);
  assert.equal(captured!.deliveryFee, 0);
});

test('pick-up orders never pay a delivery fee', async () => {
  let captured: CreateOrderWithItemsArgs | null = null;
  const deps = withDeps(createDeps(), {
    getDeliverySettings: async () => ({ deliveryFee: 30000, freeDeliveryThreshold: 500000 }),
    createOrderWithItems: async (args) => { captured = args; return { id: 'o1', orderNumber: 'BK1', orderItems: [] }; },
  });
  const payload = buildPayload('COD');
  await handleCreateOrderRequest({ ...payload, customerAddress: undefined }, deps);
  assert.equal(captured!.deliveryFee, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:node -- tests/orders/orders-route.test.ts`
Expected: FAIL — delivery fee is 0 and `getDeliverySettings` dep is missing.

- [ ] **Step 3: Implement `lib/delivery-settings.ts`**

`getDeliverySettings()` reads the two Setting keys with defaults 30000 / 500000 (missing or non-numeric rows fall back; never NaN), mirroring `lib/membership/rules.ts`. The orders route gains `getDeliverySettings` in `CreateOrderDeps` (default impl wraps the lib function) and computes: orders with a non-empty `customerAddress` → `deliveryFee = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold ? 0 : deliveryFee`; pickup (no address) → `0`. `total` already derives from `subtotal + deliveryFee - discount` in the route — verify that arithmetic uses the new fee.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:node && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery-settings.ts app/api/orders/route.ts tests/orders/orders-route.test.ts
git commit -m "fix(orders): apply admin-configured delivery fee and free-delivery threshold"
```

---

## Deferred gaps (from the same scan — candidates for follow-up plans, in priority order)

1. **Coupon admin CRUD** — the redemption engine (`/api/incentives/*`, `lib/incentives/redemption-lifecycle.ts`) is complete, but coupons can only be created by seed; no admin API/UI writes `Coupon`, and `CouponAuditLog` is never written. Marketing cannot run a campaign today.
2. **Rate limiting & chat hardening** — no throttling on login, order creation, or the unauthenticated `/api/chat` (paid LLM calls); the OTP per-IP limit is broken (`checkRateLimit` only queries by email).
3. **CI + typecheck** — 62 test files exist but nothing runs them on push; no `typecheck` script (`npx tsc --noEmit` is manual today).
4. **Server-side cart** — `Cart`/`CartItem` models are dead weight; both web and mobile carts are localStorage-only (cross-device sync lost). Largest UX refactor; deliberately deferred.
5. **Blog comments** — `BlogComment` model has zero code references; no API or UI.
6. **Storefront order detail/tracking page** — profile order rows are not clickable; no `app/(web)/orders/**` route.
7. **CMS pages unwired** — `/api/public/pages` + admin Pages CRUD exist but the storefront renders hardcoded static screens instead; `/api/public/menu` unconsumed (footer hardcodes links); `/api/notifications/device-token` has no client caller (push tokens never registered from web or mobile).
8. **Content debt** — `MOCK_POINT_HISTORY` + fake progress bar in ProfileScreen, hardcoded testimonials/FAQ/pricing on home, `/api/membership/benefits` ignored by the Membership screen, EN/VI copy mixing, dead code (`lib/store.tsx`, `lib/admin-data.ts` mocks, barrel exports), `ingredients` page missing metadata, error.tsx leaks raw error text.
9. **Mobile adoption** — `bakery-mobile` consumes this API: reviews/addresses/order-fidelity endpoints become available to it automatically once this plan ships; wiring them into the Flutter UI is a separate plan. Its known gaps: cart has no backend layer, one test file, 795-line profile screen, no FCM registration.
