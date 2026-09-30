# Tier 1 Features: Order Tracking, Rate Limiting, CI, Coupon Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 4 features a real bakery operation needs: customer order tracking (fixes a dead `/orders` link in notifications), abuse protection for the money/LLM endpoints, automated CI, and coupon management (the redemption engine exists but no coupon can ever be created).

**Architecture:** All four follow established codebase patterns. Order tracking adds one auth-gated API route reusing the route-local `serializeOrder` presentation plus one client page reading `lib/orders/presentation.ts` (pure, client-safe). Rate limiting adds an in-memory sliding-window limiter to `lib/rate-limit.ts` (per-instance; multi-instance deployments need the deferred Redis path) wired at the chat + order-create handlers through the existing DI seams. CI is a GitHub Actions workflow (no DB needed — suites use DI seams/mocks). Coupon admin mirrors the banners admin (route DI + `writeAdminActionAuditLog` + `services/admin` + `hooks/admin` + table/dialog page).

**Tech Stack:** Next.js App Router, node:test (route/lib), vitest + Testing Library (components), GitHub Actions, pnpm.

**Spec:** Bounded batch per the 2026-09-30 brainstorm (user delegated scope to executor; Tier 1 recommended scope accepted by silence). Predecessors: storefront plan (2026-09-29), bugfix batch (2026-09-30) — all merged to master.

## Global Constraints

- Package manager pnpm; gates per task: `pnpm run test:node` green, `pnpm run test:vitest` green except the 4 KNOWN pre-existing failures (`membership-benefit-visibility` ×3, `personalized-suggestions-section` ×1), `npx tsc --noEmit` clean.
- Conventional Commits on master, one commit per task; never `git add -A` (user-owned working-tree noise: pnpm lockfile drift, `.vscode/settings.json` deletion).
- Route handlers export `handleXxxRequest(request, deps)`-style seams; envelope `{ success, data | error }`; admin routes use `requirePolicy`/`requireAdmin` + `writeAdminActionAuditLog`.
- Component tests mock per `tests/vitest/membership-benefit-visibility.test.tsx` style.
- No schema changes; no new dependencies.

## Review Focus

1. **Order detail ownership** — a logged-in user must never read another user's order (404, not 200 with data); guests get 401. Pinned in Task 1.
2. **Rate limiter isolation** — one IP's burst must not throttle another IP; a blocked IP must recover when the window passes; the chat/orders routes must still succeed for fresh IPs. Pinned in Task 2.
3. **Limiter must not hang or leak** — the in-memory map must be pruned (no unbounded growth) and the check must be synchronous-cheap (no awaits that can wedge a request — contrast with the Redis hang fixed earlier). Pinned in Task 2.
4. **Coupon validation** — PERCENTAGE value must be within (0, 100]; FIXED > 0; `endAt` > `startAt`; duplicate active code rejected. Pinned in Task 4.
5. **Coupon delete safety** — a coupon with redemptions must not be hard-deleted (409); toggle via isActive instead. Pinned in Task 4.

---

### Task 1: Customer order detail page + single-order API (fixes dead `/orders` links)

**Files:**
- Create: `app/api/orders/[orderNumber]/route.ts`
- Modify: `services/order.service.ts` (add `getOrderByNumber`)
- Modify: `lib/api/endpoints.ts` (add `ORDERS.DETAIL`)
- Modify: `app/api/orders/route.ts:973` (notification `linkUrl` → `${appUrl}/orders/${orderNumber}`)
- Create: `app/(web)/orders/[orderNumber]/page.tsx`
- Modify: `components/screens/ProfileScreen.tsx` — order history rows link to the detail page
- Test: `tests/orders/order-detail-route.test.ts` (new), extend `tests/vitest/checkout-order-fidelity.test.tsx` or new `tests/vitest/order-detail-page.test.tsx`

**Interfaces:**
- API: `GET /api/orders/[orderNumber]` → envelope `{ order: <serializeOrder-shaped> }`; deps seam `handleGetOrderRequest(request, { orderNumber }, { getCurrentUser, findOrderForUser })`; 401 unauthenticated, 404 not found **or owned by someone else** (no existence leak).
- Service: `orderService.getOrderByNumber(orderNumber: string): Promise<Order>` via `ENDPOINTS.ORDERS.DETAIL(orderNumber)`.
- Page: client component; order status badge via `lib/orders/presentation.ts` (`getOrderStatusPresentation`, `getPaymentStatusPresentation` — pure, client-safe); items (name, message italic, qty × price), totals rows (subtotal, delivery fee, discount, total), address/pickup date (vi-VN), created date, back link `/profile`.

- [ ] **Step 1 (RED):** write `tests/orders/order-detail-route.test.ts` — 401 no session; 404 other user's order; 200 owner with envelope + `order.orderNumber` + `orderItems` passthrough. Run: `pnpm run test:node -- tests/orders/order-detail-route.test.ts` → FAIL (module missing).
- [ ] **Step 2 (GREEN):** implement the route (mirror `handleGetOrdersRequest`'s deps: reuse its `findOrdersByUserId`-style lookup by `orderNumber` + `userId`), wire service + endpoint.
- [ ] **Step 3:** update notification `linkUrl` (orders route line ~973; grep payment callbacks for other `/orders` links and update identically).
- [ ] **Step 4 (RED→GREEN):** page component test — mock `orderService.getOrderByNumber` returning a full order; assert heading `#BK…`, status label, item line `name × qty`, message italic, delivery fee row, total; assert a NOT-FOUND state for a rejected fetch.
- [ ] **Step 5:** implement the page; wire ProfileScreen rows to `<Link href={/orders/${orderNumber}}>`.
- [ ] **Step 6:** gates + commit `feat(orders): customer order detail page with owner-scoped API`.

---

### Task 2: In-memory rate limiting for chat + order creation

**Files:**
- Modify: `lib/rate-limit.ts` (add generic IP limiter + configs)
- Modify: `app/api/chat/route.ts`, `app/api/orders/route.ts` (POST path)
- Test: `tests/rate-limit-ip.test.ts` (new); extend chat/orders route tests for 429

**Interfaces:**
- `checkIpRateLimit(ip: string, scope: string, config: { max: number; windowMs: number }): { allowed: boolean; retryAfterSec: number }` — in-memory sliding window `Map<string, number[]>`, prunes expired entries per call and caps tracked IPs (evict oldest past prune) so the map cannot grow unbounded; synchronous, no awaits.
- Configs: `RATE_LIMITS.CHAT_PER_IP = { max: 10, windowMs: 5 * 60_000 }`, `RATE_LIMITS.ORDERS_PER_IP = { max: 5, windowMs: 10 * 60_000 }`.
- Routes: 429 envelope `{ success: false, error: 'Too many requests. Please try again later.' }` + `Retry-After` header. Handler deps gain `checkIpRateLimit` + `getClientIp` seams (real defaults) so tests inject bursts.
- Note (code comment): in-memory = per-instance; horizontal deployments need the deferred shared-store limiter.

- [ ] **Step 1 (RED):** limiter unit tests — burst over max → blocked with retryAfter; different IP unaffected; after window passes (inject timestamps via a `now` param or exported clock seam) → allowed; map size bounded. Run → FAIL (missing exports).
- [ ] **Step 2 (GREEN):** implement limiter.
- [ ] **Step 3 (RED→GREEN):** chat route test — 11th call from same injected IP → 429, 1st passes; orders route test — 6th POST → 429.
- [ ] **Step 4:** wire both routes (chat: entry of the POST handler; orders: `handleCreateOrderRequest` before validation).
- [ ] **Step 5:** gates + commit `feat(security): rate limit chat and order creation per IP`.

---

### Task 3: CI workflow + typecheck script

**Files:**
- Modify: `package.json` (add `"typecheck": "tsc --noEmit"`)
- Create: `.github/workflows/ci.yml`

**Interfaces:** workflow `on: [push, pull_request]`; steps: checkout → pnpm via `pnpm/action-setup` + corepack → Node (match repo, check `.nvmrc`/CI default during implementation) → `pnpm install --frozen-lockfile` → `npx prisma generate` → `pnpm typecheck` → `pnpm run test:node` → `pnpm run test:vitest`. No DB services needed (tests use DI seams; generate doesn't connect). Config file — TDD exception (configuration), verified by a successful local run of the same commands.

- [ ] **Step 1:** add typecheck script; run `pnpm typecheck` (clean).
- [ ] **Step 2:** write the workflow; run the exact step commands locally in one chain to prove they pass as configured.
- [ ] **Step 3:** commit `ci: add github actions workflow running typecheck and tests`.

---

### Task 4: Coupon admin management (CRUD + UI)

**Files:**
- Create: `app/api/admin/coupons/route.ts`, `app/api/admin/coupons/[id]/route.ts`
- Create: `services/admin/coupons.service.ts`, `hooks/admin/use-coupons.ts`
- Create: `app/admin/coupons/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx` (Coupons entry), `lib/api/endpoints.ts` (ADMIN.COUPONS)
- Test: `tests/admin/admin-coupons-routes.test.ts` (new); `tests/vitest/admin-coupons-page.test.tsx` (new)

**Interfaces:**
- GET list: `{ coupons, pagination }`, search by code, include `_count.redemptions` + active window status. POST/PUT payload: `{ code, type: 'PERCENTAGE'|'FIXED', value, minOrder?, maxDiscount?, startAt, endAt, usageLimit?, perUserLimit?, isActive? }` — validation: code trimmed/UPPERCASE unique (P2002 → 400 "Coupon code already exists"), `value > 0`, PERCENTAGE `value <= 100`, `endAt > startAt`, limits ≥ 1 or null. PUT also toggles `isActive`. DELETE: 409 `Coupon has redemptions and cannot be deleted` when `_count.redemptions > 0`, else hard delete; audit via `writeAdminActionAuditLog` (banners pattern — the audit pipeline works since the FK fix).
- Auth: `requireAdmin` (mirror banners).
- Page: table (code, discount text "10% off"/"50.000₫ off", window, usage `_count.redemptions/usageLimit`, status badge, edit/toggle actions) + create/edit dialog; sidebar entry "Coupons" after Membership.

- [ ] **Step 1 (RED):** route tests — list envelope + pagination; POST happy path (200 + DB-write dep called with normalized uppercase code); POST duplicate code → 400; POST PERCENTAGE 150 → 400; PUT toggle isActive; DELETE with redemptions → 409, without → 200. Run → FAIL (modules missing).
- [ ] **Step 2 (GREEN):** implement both routes mirroring the banners pattern (DI, requireAdmin, audit call on mutations).
- [ ] **Step 3 (RED→GREEN):** page component test — mocks for `services/admin/coupons.service` list; assert table renders a coupon row and dialog submit calls the create service with normalized payload.
- [ ] **Step 4:** implement service + hooks + page + sidebar entry.
- [ ] **Step 5:** gates + commit `feat(admin): coupon management UI and API`.

---

## Out of scope (deferred, unchanged)

Tier 2 (points history API, newsletter wire, money-safety gates, blog comments), server-side cart, CMS wiring, i18n cleanup, mobile adoption. Multi-instance rate limiting (needs shared store — code comment marks the seam).
