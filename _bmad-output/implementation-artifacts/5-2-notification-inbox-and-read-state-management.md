# Story 5.2: Notification Inbox and Read-State Management

Status: review

## Story

As a customer,
I want to view and mark notifications as read,
so that I can manage my message backlog.

## Acceptance Criteria

1. Given I am authenticated with notification history, when I open the notification inbox, then I can see paginated notification items with stable ordering and clear read/unread state.
2. Given I mark one notification as read or use mark-all, when the action completes, then read-state persists in backend and UI counters/list state update consistently.
3. Given notification records include both GLOBAL and USER-targeted entries, when I query inbox APIs, then only authorized, published, audience-eligible notifications are returned.
4. Given notification inbox interactions run alongside active storefront flows, when read-state updates occur, then API response envelopes and cache updates remain contract-safe (`{ success, data?, error? }`) without regressing existing routes/components.

## Tasks / Subtasks

- [x] Harden customer inbox query/read-state contracts (AC: 1, 3, 4)
  - [x] Verify `GET /api/notifications` pagination, unread filter, and ordering semantics are deterministic.
  - [x] Verify `POST /api/notifications/[id]/read` and `POST /api/notifications/read-all` preserve authorization + audience checks.
  - [x] Keep response envelopes stable and non-breaking for existing consumer hooks/services.

- [x] Finalize client-side inbox behavior (AC: 1, 2, 4)
  - [x] Ensure `hooks/use-notifications.ts` invalidation strategy correctly refreshes unread counters and list pages.
  - [x] Ensure navbar inbox behavior handles infinite loading + read-state updates without duplicate mutation storms.
  - [x] Preserve existing UX copy/layout patterns in `components/web/navbar.tsx` (do not redesign in this story).

- [x] Verify audience-scope compatibility from Story 5.1/5.2 boundary (AC: 1, 3)
  - [x] Confirm GLOBAL vs USER-targeted notification visibility behavior with read-state lifecycle.
  - [x] Confirm compatibility with dispatch-generated notifications and admin-published campaign notifications.

- [x] Add/extend regression tests (AC: 1..4)
  - [x] Add route-level tests for notification listing/read/read-all edge cases and authorization.
  - [x] Add tests for read-state idempotency (repeat read should not break or duplicate state).
  - [x] Add tests or focused assertions for query invalidation/counter consistency at hook/service layer where practical.

## Dev Notes

- Scope boundaries:
  - In scope: customer notification inbox behavior, read-state lifecycle correctness, API+hook consistency.
  - Out of scope: notification personalization analytics, major notification UI redesign, new delivery channels.

- Existing implementation baseline to build on:
  - Customer APIs: `app/api/notifications/route.ts`, `app/api/notifications/[id]/read/route.ts`, `app/api/notifications/read-all/route.ts`
  - Client hooks/services: `hooks/use-notifications.ts`, `services/notifications.service.ts`
  - Active inbox surface: `components/web/navbar.tsx`
  - Data model: `Notification`, `NotificationRead`, `NotificationAudience` in `prisma/schema.prisma`
  - Dispatch pipeline from Story 5.1: `lib/notifications/dispatcher.ts`

- Architecture guardrails:
  - Preserve route -> domain/service -> prisma layering.
  - Keep API contract consistency (`success/data/error`) and avoid shape drift in notification DTOs.
  - Apply project-context backend/frontend sync rule when changing notification API fields.

- Latest technical notes (validated against primary docs):
  - Next.js route handlers continue to use file-convention-based `route.ts`, with segment config and current App Router behavior in Next 16.x.
  - TanStack Query v5 `useInfiniteQuery` requires `initialPageParam` and `getNextPageParam`; invalidation should use key-scoped `queryClient.invalidateQueries(...)` for stale+refetch behavior.
  - Prisma `upsert` is appropriate for idempotent read-state writes where needed.

### Project Structure Notes

- Primary touch points (expected):
  - `app/api/notifications/**`
  - `hooks/use-notifications.ts`
  - `services/notifications.service.ts`
  - `components/web/navbar.tsx`
  - `tests/**` (notification route/hook/service behavior)

- Anti-reinvention guidance:
  - Reuse existing notification hooks/services/API routes; do not create parallel inbox endpoints.
  - Reuse `NotificationRead` lifecycle instead of introducing alternate read-tracking tables.
  - Keep admin notification surfaces separate; this story is customer inbox lifecycle.

### Testing Requirements

- Verify inbox list returns only published + audience-eligible notifications for authenticated user.
- Verify unread-only filter and pagination produce stable, deterministic results.
- Verify mark-read endpoint is idempotent and updates read state without duplicates.
- Verify mark-all updates all unread eligible notifications and returns accurate count.
- Verify unread counter/list sync after read actions via existing query invalidation strategy.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.2)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR26, NFR16, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (API boundaries, response contract consistency, module layering)
- Previous story context: `_bmad-output/implementation-artifacts/5-1-event-driven-notification-delivery.md`
- Existing customer notification APIs: `app/api/notifications/route.ts`, `app/api/notifications/[id]/read/route.ts`, `app/api/notifications/read-all/route.ts`
- Existing notification client layer: `hooks/use-notifications.ts`, `services/notifications.service.ts`
- Active inbox UI surface: `components/web/navbar.tsx`
- Next.js Route Handler docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- TanStack Query `useInfiniteQuery` docs: https://tanstack.com/query/latest/docs/framework/react/reference/useInfiniteQuery
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- Prisma upsert docs: https://www.prisma.io/docs/orm/prisma-client/queries/crud#update-or-create-records

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented dependency-injected handlers for customer notification list/read/read-all routes to improve testability and contract stability.
- Added deterministic ordering tie-breaker on inbox listing (`publishedAt`, `createdAt`, `id`) and limit clamp for API safety.
- Added regression tests for route-level authorization, idempotent mark-read behavior, mark-all flow, and notification service endpoint/query behavior.
- Validation commands:
  - `npx tsx --test tests/notifications/notifications-routes.test.ts tests/notifications/notifications-service.test.ts tests/notifications/dispatcher.test.ts`
  - `npm run test:node`
  - `npm run lint` (passes with one pre-existing warning in unrelated file: `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Completed API hardening for Story 5.2 by extracting explicit request handlers and dependency boundaries while preserving route contracts.
- Added deterministic pagination behavior guardrails and preserved standardized response envelope across notification endpoints.
- Added focused notification route/service tests covering read lifecycle and audience-safe access semantics.
- Verified no node-test regressions; lint remains clean except an unrelated pre-existing warning.

### File List

- _bmad-output/implementation-artifacts/5-2-notification-inbox-and-read-state-management.md
- app/api/notifications/route.ts
- app/api/notifications/[id]/read/route.ts
- app/api/notifications/read-all/route.ts
- services/notifications.service.ts
- tests/notifications/notifications-routes.test.ts
- tests/notifications/notifications-service.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-04-09: Created Story 5.2 implementation context with route/hook/UI guardrails and test expectations.
- 2026-04-09: Implemented Story 5.2 inbox/read-state hardening with route/service regression tests; status moved to review.

## Story Context Status

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story implementation completed and status set to `review`.
