# Story 1.2: Secure Sign-In and Sign-Out Session Flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to sign in and sign out securely,
so that my account session is protected.

## Acceptance Criteria

1. Given my account is verified, when I sign in with valid credentials, then the system creates a secure session and returns standardized API payload format.
2. Given I sign out, when logout completes, then active session is invalidated and session cookie/token is no longer accepted.
3. Given a stale, revoked, or invalid token, when protected endpoints are called, then the API rejects access with consistent unauthorized response.
4. Given invalid login input or credentials, when login is attempted, then response remains safe (no sensitive detail leakage) and follows `{ success, data?, error? }`.

## Tasks / Subtasks

- [x] Harden login endpoint contract and validation (AC: 1, 4)
  - [x] Confirm `POST /api/auth/login` validates required fields and normalized email format.
  - [x] Ensure credential failures return safe generic message and standardized error envelope.
  - [x] Ensure only verified + active users can receive session tokens.
- [x] Enforce secure session issuance and cookie behavior (AC: 1)
  - [x] Confirm session creation via `lib/session.ts` with proper expiry.
  - [x] Confirm cookie settings are secure (`httpOnly`, `sameSite`, `secure in prod`).
  - [x] Confirm login success payload follows standardized `{ success, data }` shape.
- [x] Enforce logout invalidation path (AC: 2)
  - [x] Confirm `POST /api/auth/logout` removes server session and clears cookie.
  - [x] Ensure subsequent requests with old token/session are rejected.
- [x] Validate stale-token rejection on protected APIs (AC: 3)
  - [x] Confirm `getCurrentUserFromRequest` + session lookup reject expired/deleted sessions.
  - [x] Verify `/api/auth/me` and at least one protected customer API reject stale token consistently.
- [x] Align frontend auth lifecycle behavior (AC: 1, 2, 3)
  - [x] Ensure `authService.login` stores token and user context correctly.
  - [x] Ensure `authService.logout` removes local token and clears cached auth state.
  - [x] Confirm no endpoint mismatch between `lib/api/endpoints.ts` and auth service usage.
- [x] Add tests for login/logout/session invariants (AC: 1, 2, 3, 4)
  - [x] Unit tests for auth/session guard logic (verified/active/expired/revoked paths).
  - [x] Route contract tests for login/logout envelopes and unauthorized handling.

## Dev Notes

- Epic context:
  - Epic 1 builds identity foundation (FR1-FR5).
  - Story 1.2 directly implements FR2 and depends on Story 1.1 verified-account model.
- Story-specific guardrails:
  - Preserve API response contract `{ success, data?, error? }` on all auth routes.
  - Do not leak whether email exists or account internals in login errors.
  - Session acceptance must require active user and verified email.
  - Preserve bearer-token compatibility in protected APIs where already implemented.
- Architecture constraints to follow:
  - Keep route -> service/util layering; no UI direct DB access.
  - Keep auth/session logic centralized in `lib/session.ts` and route handlers under `app/api/auth/**`.
  - Preserve existing stack and conventions (Next.js App Router, TypeScript, Prisma, React Query).

### Previous Story Intelligence (Story 1.1)

- Registration + verification now use strict standardized envelopes; avoid regressions to mixed response shapes.
- Unverified users are already blocked in session resolution; Story 1.2 must maintain this invariant.
- Verify-email alias is now canonical (`/api/auth/verify-email`) and frontend endpoint constants were updated.
- Existing review findings emphasized:
  - Avoid account enumeration leakage.
  - Keep OTP/session edge behavior explicit and testable.
  - Keep story artifacts and logs clean and traceable.

### Project Structure Notes

- Primary server touch points:
  - `app/api/auth/login/route.ts`
  - `app/api/auth/logout/route.ts`
  - `app/api/auth/me/route.ts`
  - `lib/session.ts`
  - `lib/auth-token.ts`
- Primary client touch points:
  - `services/auth.service.ts`
  - `hooks/use-auth.ts`
  - `providers/auth-provider.tsx` (if state-sync fixes needed)
- Testing touch points:
  - `tests/auth/*` for route contract + session guard tests.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-12-Secure-Sign-In-and-Sign-Out-Session-Flow]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-1-Account--Membership-Foundation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/implementation-artifacts/1-1-register-account-with-email-verification.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first ready-for-dev story from sprint status: `1-2-secure-sign-in-and-sign-out-session-flow`.
- Reviewed auth routes (`login`, `logout`, `me`), session utilities, and protected API behavior (`orders`).
- Added shared session guard utility and expanded auth test coverage.
- Validation run: targeted eslint on modified files, `npx tsx --test tests/auth/*.test.ts`, and full `npm run lint`.

### Completion Notes List

- Implemented AC1: login now issues secure session only for verified + active users and returns standardized envelope.
- Implemented AC2: logout path confirmed to invalidate server session and clear cookie; stale token rejected on next access.
- Implemented AC3: stale/revoked/invalid session rejection preserved through `getSessionByToken` and `getCurrentUserFromRequest`.
- Implemented AC4: login failures use safe generic message (`Email hoặc mật khẩu không đúng`) to avoid account-state leakage.
- Removed frontend auth debug log noise from `authService.login`.
- Added unit tests for session guard logic and route contract tests for login/logout/me.
- Full lint passes with one unrelated pre-existing warning in `app/api/public/products/filters/route.ts`.

### File List

- app/api/auth/login/route.ts
- lib/session.ts
- lib/auth/session-utils.ts
- services/auth.service.ts
- tests/auth/session-utils.test.ts
- tests/auth/auth-endpoints.test.ts
- _bmad-output/implementation-artifacts/1-2-secure-sign-in-and-sign-out-session-flow.md

## Change Log

- 2026-04-04: Implemented Story 1.2 end-to-end (secure login/logout session flow, stale-token enforcement checks, safe error responses, tests, and validation).
