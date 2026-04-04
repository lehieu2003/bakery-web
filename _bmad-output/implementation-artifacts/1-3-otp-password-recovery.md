# Story 1.3: OTP Password Recovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who forgot my password,
I want to reset it via OTP verification,
so that I can recover access without support intervention.

## Acceptance Criteria

1. Given I request password reset for a valid account, when I submit reset request, then OTP is issued and delivery is attempted without revealing whether account exists.
2. Given I submit correct OTP and a valid new password, when verification succeeds, then password is updated and all existing sessions are revoked.
3. Given OTP is invalid, expired, or too many failed attempts occurred, when verification is attempted, then API returns safe error response without account existence leakage.
4. Given reset-password endpoints are invoked, when response is returned, then payload follows standardized `{ success, data?, error? }` contract.

## Tasks / Subtasks

- [x] Standardize reset-password route contract and safe messaging (AC: 1, 3, 4)
  - [x] Refactor `app/api/auth/reset-password/route.ts` responses to use `{ success, data?, error? }` shape (including `429` and error branches).
  - [x] Keep non-enumerating behavior for unknown email (`same success message as existing account path`).
  - [x] Preserve rate-limit and cooldown behavior from `lib/rate-limit.ts`.
- [x] Standardize reset-password verification contract and session revocation path (AC: 2, 3, 4)
  - [x] Refactor `app/api/auth/reset-password/verify/route.ts` to standardized envelope for success and failure.
  - [x] Keep OTP verification via `lib/otp.ts` (`RESET_PASSWORD` purpose) and password hashing via `lib/password.ts`.
  - [x] Preserve `prisma.session.deleteMany({ where: { userId } })` after password update.
- [x] Align client service typing to normalized envelope behavior (AC: 4)
  - [x] Confirm/adjust `services/auth.service.ts` methods `resetPassword` and `resetPasswordVerify` to consume normalized response payload.
  - [x] Ensure endpoint constants stay aligned in `lib/api/endpoints.ts`.
- [x] Add focused tests for reset-password request/verify invariants (AC: 1, 2, 3, 4)
  - [x] Add route-contract tests under `tests/auth/*` for success/error envelopes.
  - [x] Add tests for OTP invalid/expired/max-attempt behavior propagation and safe message handling.
  - [x] Add tests verifying reset flow revokes prior sessions.

### Review Findings

- [x] [Review][Patch] Reset-request throttling is ineffective for unknown emails because throttle state only exists when OTP rows are created [`app/api/auth/reset-password/route.ts:34`]
- [x] [Review][Patch] Route-level contract/behavior tests for reset-password handlers are still missing despite story requirement [`tests/auth/reset-password-utils.test.ts:1`]

## Dev Notes

- Epic context:
  - Epic 1 builds identity foundation (FR1-FR5).
  - Story 1.3 directly covers FR3 and depends on Story 1.1/1.2 auth/session invariants.
- Existing implementation already present:
  - `POST /api/auth/reset-password` and `POST /api/auth/reset-password/verify` exist.
  - Work should harden and normalize current behavior; do not re-implement OTP engine.
- Critical guardrails:
  - No account enumeration in request or verify responses.
  - Keep OTP state handling in `lib/otp.ts`; do not duplicate hashing/attempt/expiry logic.
  - Keep auth API response format consistent with prior story outputs (`{ success, data?, error? }`).
  - Preserve secure password update semantics and force session invalidation.

### Previous Story Intelligence (Story 1.2)

- Story 1.2 established strict auth envelope standardization and safe login errors.
- Story 1.2 added tests and guard patterns around stale/revoked sessions; apply the same rigor to password reset.
- Bearer/session compatibility on protected routes was recently hardened; avoid regressions while revoking sessions post-reset.

### Git Intelligence Summary (Recent Patterns)

- `da100b2`: auth fixes favored compatibility-preserving updates over broad rewrites.
- `6dc6510`: bearer-token support adjusted incrementally at route boundaries.
- Pattern to follow: minimal scoped edits in auth routes + targeted tests in `tests/auth`.

### Library / Framework Requirements

- Runtime stack in repository:
  - `next@16.1.6`, `react@19.2.3`, `typescript@^5`, `@prisma/client@^6.4.0`.
- Keep route handlers aligned with Next.js App Router Route Handlers (`Request`/`Response` APIs, current docs updated 2026-02-27).
- No new auth dependencies required for this story.

### Project Structure Notes

- Primary server touch points:
  - `app/api/auth/reset-password/route.ts`
  - `app/api/auth/reset-password/verify/route.ts`
  - `lib/otp.ts`
  - `lib/password.ts`
  - `lib/rate-limit.ts`
- Primary client touch points:
  - `services/auth.service.ts`
  - `lib/api/endpoints.ts`
- Testing touch points:
  - `tests/auth/*`

### Testing Requirements

- Add/update tests to prove:
  - Standardized response envelope for both reset routes.
  - Unknown-email request path does not reveal account existence.
  - Invalid/expired/over-attempt OTP handling is deterministic and safe.
  - Password reset success revokes existing sessions.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-13-OTP-Password-Recovery]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-1-Account--Membership-Foundation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/implementation-artifacts/1-2-secure-sign-in-and-sign-out-session-flow.md]
- [Source: https://nextjs.org/docs/app/building-your-application/routing/router-handlers]
- [Source: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first ready-for-dev story from sprint status: `1-3-otp-password-recovery`.
- Marked sprint status to `in-progress` before implementation.
- RED phase: `npx tsx --test tests/auth/reset-password-utils.test.ts` failed with `MODULE_NOT_FOUND` for new utility.
- GREEN phase: implemented reset-password utility module and standardized both reset routes to `{ success, data?, error? }`.
- Added auth tests for reset endpoint constants and reset utility behavior.
- Validation run:
  - `npx tsx --test tests/auth/reset-password-utils.test.ts`
  - `npx tsx --test tests/auth/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts`
  - `npm run lint` (passes with one pre-existing warning in `app/api/public/products/filters/route.ts`).
- Review-fix iteration after code-review findings:
  - Hardened `applyPasswordReset` to run in a single Prisma transaction.
  - Moved reset-request throttling checks before account-existence branching.
  - Expanded sanitize logic for account-nonexistence error variants.
- Review-fix validation rerun:
  - `npx tsx --test tests/auth/reset-password-utils.test.ts`
  - `npx tsx --test tests/auth/*.test.ts`
  - `npm run lint` (same pre-existing warning only).

### Completion Notes List

- Implemented AC1: reset request route now returns standardized envelope and preserves account-enumeration-safe generic success response.
- Implemented AC2: reset verify route now updates password through utility and revokes all existing sessions deterministically.
- Implemented AC3: verify flow sanitizes user-not-found detail into safe generic invalid-reset error.
- Implemented AC4: both reset routes now consistently return `{ success, data?, error? }`.
- Confirmed frontend `authService.resetPassword` and `authService.resetPasswordVerify` already consume `response.data` and required no further structural change.
- Added tests for reset payload utilities, safe error sanitization, and password-reset session revocation behavior.
- Resolved review finding (High): password update + session revocation now execute atomically in Prisma transaction.
- Resolved review finding (Medium): reset-request path now applies throttle checks before account existence branching.
- Resolved review finding (Low): sanitize logic now handles broader "does not exist" variants.
- Resolved review patch: throttle state is now written for both existing and non-existing emails before branching.
- Resolved review patch: added handler-level route contract tests for both reset-password endpoints.

### File List

- app/api/auth/reset-password/route.ts
- app/api/auth/reset-password/verify/route.ts
- lib/auth/reset-password-utils.ts
- tests/auth/auth-endpoints.test.ts
- tests/auth/reset-password-utils.test.ts
- tests/auth/reset-password-routes.test.ts
- \_bmad-output/implementation-artifacts/1-3-otp-password-recovery.md

## Change Log

- 2026-04-04: Implemented Story 1.3 end-to-end (standardized reset-password API envelopes, safe error handling, session revocation utility, and auth tests).
- 2026-04-04: Addressed code-review findings for Story 1.3 (transactional password-reset side effects, pre-branch throttling checks, and stronger sanitize matching).
- 2026-04-04: Closed remaining review patch items (unknown-email throttling state and route-level reset handler contract tests).
