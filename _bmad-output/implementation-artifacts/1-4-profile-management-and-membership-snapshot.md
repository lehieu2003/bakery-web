# Story 1.4: Profile Management and Membership Snapshot

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to view and update my profile and see my membership status,
so that I can maintain account data and understand available benefits.

## Acceptance Criteria

1. Given I am signed in, when I open profile settings, then I can read and update allowed profile fields with validation.
2. Given I am signed in, when profile data is shown, then membership tier and points are read from authoritative backend data.
3. Given profile APIs are called, when responses are returned, then payloads follow standardized `{ success, data?, error? }` contract.
4. Given backend contract changes for profile/membership, when implementation is completed, then frontend services/hooks/UI call sites are updated in the same story (or explicitly tracked as deferred work).

## Tasks / Subtasks

- [x] Implement authenticated profile read/update API behavior (AC: 1, 2, 3)
- [x] Reuse `app/api/auth/me/route.ts` for authoritative read model; add/update write endpoint under `app/api/auth/*` for allowed self-service fields (`name`, `phone`) only (AC: 1, 2, 3)
- [x] Enforce auth via `getCurrentUser`/session checks and return 401 for unauthenticated requests (AC: 1, 3)
- [x] Keep membership fields (`memberLevel`, `points`) server-authoritative and read-only in customer profile update path (AC: 2)
- [x] Add input validation and safe error handling for update payloads; reject invalid phone/name values with 400 envelope errors (AC: 1, 3)

- [x] Align frontend service + hook contracts with profile API (AC: 1, 2, 4)
- [x] Extend `services/auth.service.ts` with profile update method using centralized `ENDPOINTS` and normalized API client handling (AC: 1, 3, 4)
- [x] Add React Query mutation in `hooks/use-auth.ts` and invalidate/set `authKeys.user()` after successful update (AC: 1, 2, 4)
- [x] Add endpoint/type updates in `lib/api/endpoints.ts` and `types/api.types.ts` only if contract requires new request type(s) (AC: 3, 4)

- [x] Update profile UI to support editable profile fields while keeping membership snapshot backend-driven (AC: 1, 2, 4)
- [x] Update `components/screens/ProfileScreen.tsx` to use auth query/mutation for profile read + save feedback (AC: 1, 2)
- [x] Keep membership display (`memberLevel`, `points`) mapped from backend user state; remove any local/mock-only source for authoritative values (AC: 2)
- [x] Preserve existing logout and order-history behavior; avoid regressions in profile page composition (AC: 1, 4)

- [x] Add focused automated tests (AC: 1, 2, 3, 4)
- [x] Add route tests under `tests/auth/*` for profile update happy path, validation failures, unauthorized access, and response envelope shape (AC: 1, 3)
- [x] Add/extend frontend contract tests where available to ensure service/hook consume updated payload correctly (AC: 4)

### Review Findings

- [x] [Review][Patch] PATCH handler crashes on non-object JSON body, returning 500 instead of validation 400 [app/api/auth/me/route.ts:138]

## Dev Notes

- Epic context:
- Epic 1 establishes identity foundation (FR1-FR5). Story 1.4 closes FR4/FR5 by combining profile update with membership snapshot visibility.

- Existing implementation baseline:
- `GET /api/auth/me` already exists and returns `user` with `memberLevel` and `points`.
- `components/screens/ProfileScreen.tsx` currently mixes membership UI content with cart-derived user formatting; profile edit flow is not implemented.
- `authService.me()` and `useUser()` already provide canonical authenticated user fetch path.

- Critical guardrails:
- Do not introduce direct DB access in UI/hooks/services; keep route/service boundaries intact.
- Preserve standardized response envelope `{ success, data?, error? }` for any new/updated auth route.
- Do not allow customer profile endpoint to mutate `memberLevel`, `points`, `role`, `email`, or `isActive`.
- Follow project rule: every backend/API contract change requires same-story frontend impact check and updates.

### Architecture Compliance

- Keep route handlers in `app/api/**/route.ts` and client orchestration in `services/*` + `hooks/*`.
- Reuse existing auth/session model (`lib/session.ts`) and API boundary partition (`/api/auth/*` for identity lifecycle).
- Maintain consistency with existing auth route error semantics and HTTP status mapping.

### Previous Story Intelligence (Story 1.3)

- Story 1.3 standardized auth response contracts and hardened reset flows with transaction safety + route-level tests.
- Apply same discipline here: contract-first route behavior, safe validation errors, and targeted auth tests.
- Story 1.3 also reinforced backend-frontend sync requirements; do not close Story 1.4 without checking service/hook/UI call sites.

### Git Intelligence Summary

- Recent auth work favors scoped, compatibility-preserving changes over broad rewrites.
- Pattern to follow: minimal route changes, explicit envelope consistency, and focused tests in `tests/auth`.

### Library / Framework Requirements

- Use repository stack as-is: `next@16.1.6`, `react@19.2.3`, `typescript@^5`, `@tanstack/react-query@^5.90.21`, `@prisma/client@^6.4.0`.
- Prefer existing project validation/util patterns already used in auth routes; do not introduce a new validation framework.

### Project Structure Notes

- Expected primary touch points:
- `app/api/auth/me/route.ts`
- `app/api/auth/<profile-update>/route.ts` (new or extended auth route)
- `services/auth.service.ts`
- `hooks/use-auth.ts`
- `components/screens/ProfileScreen.tsx`
- `lib/api/endpoints.ts` and/or `types/api.types.ts` (if contract additions are required)
- `tests/auth/*`

### Testing Requirements

- Verify unauthorized requests to profile endpoints return `401` with safe envelope.
- Verify valid update only changes allowed profile fields.
- Verify invalid payload returns `400` with deterministic error response.
- Verify frontend auth user cache updates after successful profile save.
- Run lint + relevant test suites before marking story done.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-14-Profile-Management-and-Membership-Snapshot]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-1-Account--Membership-Foundation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional-Requirements]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/1-3-otp-password-recovery.md]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first backlog story from sprint status: `1-4-profile-management-and-membership-snapshot`.
- Loaded epics, architecture, PRD, previous story, project-context, and recent git commits for context synthesis.
- Story status moved to `in-progress` in sprint tracking before implementation.
- Added handler-level route logic in `app/api/auth/me/route.ts` with exported GET/PATCH handlers for deterministic route tests.
- Validation commands executed:
  - `npx tsx --test tests/auth/me-route.test.ts`
  - `npx tsx --test tests/auth/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts`
  - `npm run lint` (passes with one pre-existing warning in `app/api/public/products/filters/route.ts`)
  - `npx tsc --noEmit -p tsconfig.json` (fails due pre-existing unrelated repository issues in `.next/types/validator.ts` and `tests/auth/reset-password-routes.test.ts`)

### Completion Notes List

- Story context assembled with backend/frontend synchronization requirements and explicit anti-regression guardrails.
- Added `PATCH /api/auth/me` profile update flow with strict allowlist (`name`, `phone`) and validation.
- Kept membership fields (`memberLevel`, `points`) read-only on customer profile update path.
- Preserved standardized auth envelope `{ success, data?, error? }` for both `GET` and `PATCH` on `/api/auth/me`.
- Added auth service + hook support for profile update and cache refresh (`authKeys.user()`).
- Updated Profile UI to support edit/save/cancel for name/phone while showing authoritative membership snapshot from auth user state.
- Added route-level auth tests for `/api/auth/me` happy path + unauthorized + validation + field-allowlist behavior.
- ✅ Resolved review finding [Medium]: non-object JSON payload for `PATCH /api/auth/me` now returns validation `400` instead of falling into `500`.

### File List

- app/api/auth/me/route.ts
- components/screens/ProfileScreen.tsx
- hooks/use-auth.ts
- services/auth.service.ts
- tests/auth/me-route.test.ts
- types/api.types.ts
- _bmad-output/implementation-artifacts/1-4-profile-management-and-membership-snapshot.md

## Change Log

- 2026-04-04: Implemented Story 1.4 profile management and membership snapshot (backend PATCH handler, frontend profile edit flow, and route-level tests).
- 2026-04-04: Addressed code review findings - 1 items resolved.
