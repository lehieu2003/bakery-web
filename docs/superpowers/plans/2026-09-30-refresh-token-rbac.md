# Refresh Token Rotation + RBAC Test Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement refresh token rotation on the existing opaque session token satisfying the 3 required rules — (1) issuing a new token revokes the old, (2) each refresh token is single-use with replay detection that revokes ALL of the user's sessions, (3) logout revokes the token on both client and server — plus a thorough RBAC test sweep.

**Architecture:** The existing DB-backed opaque session token becomes the refresh token. New `lib/auth/session-rotation.ts` exposes `rotateSession(input, deps)` with injected deps (pure, node:test friendly): atomically revoke-old + create-new in one Prisma transaction, replay detection via `revokedAt` (replaying a consumed token revokes every session of that user — the standard token-theft defense). New `POST /api/auth/refresh` (cookie + Bearer input; sets the new cookie; returns the Bearer token for mobile). `getSessionByToken` rejects revoked sessions. Logout gains Bearer support. RBAC: capability matrix (`lib/authorization-policy.ts`) is already pure — add an exhaustive matrix test plus route-guard tests (customer→admin 403, anonymous→401).

**Tech Stack:** Prisma migration (`revokedAt DateTime?` on Session), node:test with DI deps, no new dependencies.

**Spec:** User requirements verbatim: "1. Cấp token mới thì huỷ token cũ. 2. Mỗi refresh token là single use token 3. logout = huỷ token client + server" + "Test phần role based access token kỹ vào". Predecessors: storefront + bugfix + tier-1 batches on master.

## Global Constraints

- pnpm; gates per task: node suite green (370+), vitest only the 4 known baseline failures, `npx tsc --noEmit` clean.
- Conventional Commits on master, one commit per task; never `git add -A` (user-owned noise stays out).
- No behavioral change for normal browser users: the cookie flow keeps working; rotation happens only when `/api/auth/refresh` is called.
- The web `http` client already relies on the cookie — no client changes required for rule compliance.

## Review Focus

1. **Atomic single-use** — two concurrent refreshes with the same token must yield at most one new token; the loser MUST be treated as a replay (all user sessions revoked). Pinned by conditional-update design + test.
2. **Replay defense** — reusing a consumed token revokes every session of that user (not just fails the request). Pinned in Task 1.
3. **Revoked tokens cannot authenticate** — a revoked session must fail `getSessionByToken` everywhere (cookie AND Bearer), not only at the refresh endpoint. Pinned in Task 2.
4. **Rotation freshness** — the new session has a fresh 30-day expiry and a different token value; the old expiry does not carry over. Pinned in Task 1.
5. **RBAC negatives** — customer hitting an ADMIN_ONLY capability → denied; anonymous → denied; both tested through the policy matrix AND the `requireAdmin` guard. Pinned in Task 3.

---

### Task 1: Session revocation + rotation core

**Files:**
- Modify: `prisma/schema.prisma` (Session gains `revokedAt DateTime?`)
- Create: `prisma/migrations/<ts>_session_revoked_at/migration.sql`
- Create: `lib/auth/session-rotation.ts`
- Modify: `lib/session.ts` (`getSessionByToken` rejects `revokedAt != null`)
- Test: `tests/auth/session-rotation.test.ts` (new)

**Interfaces:**
- `rotateSession(input: { token: string; userAgent?: string; ipAddress?: string }, deps): Promise<{ status: 'rotated'; token: string; expiresAt: Date } | { status: 'replayed' } | { status: 'unauthorized' }>`
- Deps: `findSessionByToken(token)`, `revokeSession(id, revokedAt)` (conditional `updateMany({ where: { id, revokedAt: null } })` returning count), `createSession(userId, userAgent, ipAddress)`, `revokeAllUserSessions(userId)`, `now()`.
- Semantics: not found / expired / inactive user → `unauthorized`; found with `revokedAt != null` → revoke ALL user sessions + `replayed`; else create new (fresh expiry) + conditional-revoke old (count 0 → `replayed` path).

- [ ] **Step 1 (RED):** tests — rotated happy path (new token ≠ old, fresh expiry, old revoked); unknown token → unauthorized; expired → unauthorized; inactive user → unauthorized; replay of consumed token → `replayed` + all user sessions revoked; concurrent conditional-revoke loss (revokeSession returns count 0) → `replayed`. Run → FAIL (module missing).
- [ ] **Step 2 (GREEN):** implement with DI; wire the conditional revoke inside a deps-provided transaction where available.
- [ ] **Step 3:** migration + schema field; `getSessionByToken` adds `if (session.revokedAt) return null` (after expiry check).
- [ ] **Step 4:** gates + commit `feat(auth): single-use session rotation with replay detection`.

---

### Task 2: Refresh endpoint + revoked-token auth + logout Bearer

**Files:**
- Create: `app/api/auth/refresh/route.ts`
- Modify: `lib/session.ts` (`deleteSessionByToken` helper; `getCurrentUserFromRequest` already reads Bearer — revoked check flows through Task 1's `getSessionByToken`)
- Modify: `app/api/auth/logout/route.ts` (accept Bearer: revoke by token too)
- Test: `tests/auth/refresh-route.test.ts` (new); extend logout coverage in `tests/auth/auth-endpoints.test.ts` if the pattern supports it

**Interfaces:**
- `POST /api/auth/refresh`: input = `bakery_session` cookie OR `Authorization: Bearer`; success → sets the new `bakery_session` cookie AND returns `{ token, expiresAt }` (mobile); replay → 401 (all sessions revoked server-side); no/unknown token → 401.
- Logout: reads cookie (existing) or Bearer header → deletes that session server-side; clears cookie when present.

- [ ] **Step 1 (RED):** refresh route tests via handler seams — cookie path rotates and sets cookie; Bearer path rotates and returns token; replay → 401; missing token → 401. Run → FAIL.
- [ ] **Step 2 (GREEN):** implement route calling `rotateSession` with real prisma deps + `setSessionCookie`.
- [ ] **Step 3:** logout Bearer support + test.
- [ ] **Step 4:** gates + commit `feat(auth): refresh endpoint with replay defense and bearer logout`.

---

### Task 3: RBAC test sweep

**Files:**
- Create: `tests/auth/rbac-matrix.test.ts` (new)
- Extend: `tests/auth/session-rotation.test.ts` / refresh tests where revoked-token auth intersects
- Modify: `tests/auth/login-policy.test.ts` only if it duplicates the matrix (prefer extending the new file)

**Interfaces:** pure-matrix coverage over `hasPolicyAccess`/`getRoleCapabilities` for roles ADMIN + CUSTOMER × policies ADMIN_ONLY, AUTHENTICATED_USER, ORDERS_READ, ORDERS_WRITE, ADMIN_MANAGE_USERS (exact expected matrix asserted, not tautologies); `requireAdmin` guard: customer → denied, admin → passes; anonymous refresh/owner routes → 401 (already pinned in earlier tasks, cross-referenced).

- [ ] **Step 1 (RED where behavior is missing):** matrix test asserting the exact documented capability set per role; requireAdmin customer-denial test. Any assertion that PASSES immediately is investigated (testing existing behavior is fine — but a wrong expectation is a finding).
- [ ] **Step 2:** implement any gap found (none expected — policy lib is pure and shipped).
- [ ] **Step 3:** gates + commit `test(auth): exhaustive rbac matrix and guard coverage`.

---

## Out of scope

Short-lived JWT access tokens (would require per-request auth changes across web + mobile; the rotation rules are satisfied without them); "logout everywhere" UI; device management screens.
