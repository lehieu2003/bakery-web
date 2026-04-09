# Story 6.1: Product and Variant CRUD

Status: review

## Story

As an admin,  
I want to manage products and variants,  
so that storefront offerings stay accurate.

## Acceptance Criteria

1. Given I have authorized admin access, when I create, update, or delete products/variants, then changes are validated and persisted through service-layer rules.
2. Given product/variant mutations are executed, when the operation succeeds or fails, then API responses preserve the standardized contract (`{ success, data?, error? }`) and do not regress existing admin UI hooks/services.
3. Given critical catalog mutations occur, when product/variant data is created/updated/deleted, then an audit trail is recorded with actor and timestamp (and enough context for support/admin investigation).
4. Given existing admin product surfaces are already in use, when Story 6.1 is implemented, then behavior is hardened without creating parallel endpoints or duplicate product workflows.

## Tasks / Subtasks

- [x] Harden admin product route authorization and mutation boundaries (AC: 1, 2, 4)
- [x] Ensure `POST/PUT/DELETE /api/admin/products*` enforce admin authorization consistently.
- [x] Enforce admin authorization for list/detail reads under `/api/admin/products*`; if public read behavior is needed, route it through `/api/public/products*` instead of admin endpoints.
- [x] Keep route handler envelope/status mapping consistent with project conventions.

- [x] Consolidate product + variant validation rules at server boundary (AC: 1, 2)
- [x] Validate required payload fields and numeric bounds for product and variant write operations.
- [x] Enforce slug uniqueness and guard variant payload integrity (name/price/stock/sanitization).
- [x] Prevent unsafe write sequences by using transaction-safe mutation flow where needed.

- [x] Add audit logging for critical catalog mutations (AC: 3)
- [x] Implement mutation audit records for create/update/delete with actor identity and timestamp.
- [x] Include minimum mutation context (entity id, action, key changed fields) without leaking sensitive internals.
- [x] Reuse existing audit pattern conventions (coupon/payment logging style) instead of inventing a new incompatible shape.
- [x] Persist audit events in a queryable store (extend existing audit-log approach or add product-focused audit table with migration) and expose retrieval path needed by admin/support workflows.

- [x] Preserve and align admin client integration (AC: 2, 4)
- [x] Keep `services/admin/products.service.ts`, `hooks/admin/use-products.ts`, and `components/admin/ProductForm.tsx` contract-safe with API changes.
- [x] Ensure React Query invalidation remains deterministic for list/detail refresh after mutations.
- [x] Avoid introducing duplicate admin product forms/routes/endpoints.

- [x] Add regression tests for Story 6.1 behaviors (AC: 1..4)
- [x] Add route-level tests for admin authorization, validation failures, and envelope consistency.
- [x] Add mutation tests for variant CRUD edge cases (insert/update/remove in a single update payload).
- [x] Add focused assertions for audit trail creation on create/update/delete.

## Dev Notes

- Scope boundaries:
- In scope: harden and complete existing admin product + variant CRUD path, enforce service-layer validation, add audit trail.
- Out of scope: category hierarchy changes (Story 6.2), banner/page/menu (Story 6.3), blog admin (Story 6.4), major redesign of admin product UI.

- Existing implementation baseline to build on (extend, do not rebuild):
- API routes: `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`
- Client orchestration: `services/admin/products.service.ts`, `hooks/admin/use-products.ts`
- Admin UI: `app/admin/products/page.tsx`, `app/admin/products/new/page.tsx`, `app/admin/products/[id]/edit/page.tsx`, `components/admin/ProductForm.tsx`
- Request/response types: `types/api.types.ts` (`CreateProductRequest`, `UpdateProductRequest`, `Product`, `ProductVariant`)
- Schema models: `Product`, `ProductVariant`, `ProductImage`, `ProductCategory`, `ProductAttributeAssignment` in `prisma/schema.prisma`

- Architecture guardrails:
- Preserve route -> service -> domain utility -> Prisma layering.
- Keep privileged admin mutations under `/api/admin/*` with RBAC enforcement.
- Keep API response shape stable: `{ success, data?, error? }`.
- Do not add cross-domain writes hidden in unrelated modules.
- Preserve backend-frontend sync rule from project context: if contract changes, update service/hook/component call sites and route tests in same story.

- Auditability expectations:
- PRD requires audit visibility for critical admin actions (FR38, NFR8).
- Story 6.1 must leave a traceable mutation trail for product/variant writes with actor + timestamp.
- Prefer an extendable audit pattern compatible with current operational logging approach.

- Latest technical notes (primary docs and platform guidance):
- Next.js route handlers remain file-convention based (`route.ts`) and should keep server logic at API boundary modules.
- Prisma write patterns should use transaction-safe sequences for multi-entity mutations where consistency matters.
- TanStack Query mutation flows should invalidate feature-scoped keys deterministically after successful writes.

### Project Structure Notes

- Primary touch points (expected):
- `app/api/admin/products/route.ts`
- `app/api/admin/products/[id]/route.ts`
- `services/admin/products.service.ts`
- `hooks/admin/use-products.ts`
- `components/admin/ProductForm.tsx`
- `types/api.types.ts`
- `prisma/schema.prisma` (+ migration if audit persistence schema is added/updated)
- `tests/**` (new admin products route/service tests)

- Anti-reinvention guidance:
- Reuse existing admin product routes/services/hooks and `ProductForm` flow.
- Do not create parallel “v2” product endpoints for Story 6.1.
- Reuse existing API envelope and auth guard patterns from adjacent admin modules.

### Testing Requirements

- Verify unauthorized/non-admin requests are rejected on protected product mutation endpoints.
- Verify unauthorized/non-admin requests are rejected for all `/api/admin/products*` routes (including list/detail).
- Verify create/update/delete product flows preserve response envelope and expected status mapping.
- Verify variant update path correctly handles create/update/delete in one request without orphan or duplicate records.
- Verify slug uniqueness and invalid payload handling return safe, consistent errors.
- Verify audit entries are created for product/variant critical mutations with actor + timestamp.
- Verify admin products query invalidation still refreshes list/detail views after successful mutations.

### References

- Epic source: `_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.1)
- PRD constraints: `_bmad-output/planning-artifacts/prd.md` (FR27, FR38, FR39, NFR6, NFR8, NFR22)
- Architecture boundaries: `_bmad-output/planning-artifacts/architecture.md` (RBAC on `/api/admin/*`, response envelope consistency, route->service->domain layering)
- Project context sync rule: `_bmad-output/project-context.md` (Backend-Frontend Sync Rules)
- Existing admin product API routes: `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`
- Existing admin product client layer: `services/admin/products.service.ts`, `hooks/admin/use-products.ts`
- Existing admin product UI: `app/admin/products/page.tsx`, `app/admin/products/new/page.tsx`, `app/admin/products/[id]/edit/page.tsx`, `components/admin/ProductForm.tsx`
- Product/variant schema: `prisma/schema.prisma` (`Product`, `ProductVariant`, related models)
- Next.js Route Handlers docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Prisma transactions docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented admin product route hardening with consistent RBAC on list/detail/mutation endpoints.
- Added persisted product audit trail (`ProductAuditLog`) with actor/timestamp and mutation snapshots.
- Added product audit retrieval endpoint for admin/support visibility.
- Validation commands:
- `npx prisma generate`
- `npx tsx --test tests/admin/admin-products-routes.test.ts`
- `npm run test:node`
- `npm run lint` (passes with one pre-existing warning in unrelated file: `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Enforced admin authorization on `GET /api/admin/products` and `GET /api/admin/products/[id]` to align with `/api/admin/*` boundary rules.
- Added server-side validation guardrails for product/variant payloads and slug collision handling consistency.
- Implemented persisted mutation audit logging for create/update/delete with actor/timestamp and before/after snapshots.
- Fixed cross-product variant tampering risk by enforcing product-scoped variant ownership checks on update.
- Fixed delete-audit retention by preserving audit references after product deletion (`productRefId` + nullable FK).
- Added deterministic handling for slug uniqueness races (`P2002` => 400) and stricter image payload validation to prevent accidental image wipe.
- Added `GET /api/admin/products/[id]/audit` to expose queryable audit entries with pagination.
- Expanded route-level regression tests for admin product list/detail/audit handlers plus variant normalization and ownership guard helpers.

### File List

- _bmad-output/implementation-artifacts/6-1-product-and-variant-crud.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/story-validation-report-6-1-product-and-variant-crud-2026-04-09.md
- app/api/admin/products/route.ts
- app/api/admin/products/[id]/route.ts
- app/api/admin/products/[id]/audit/route.ts
- lib/product-audit.ts
- lib/api/endpoints.ts
- prisma/schema.prisma
- prisma/migrations/20260409133000_story_6_1_product_audit_log/migration.sql
- tests/admin/admin-products-routes.test.ts

## Change Log

- 2026-04-09: Created Story 6.1 context file with admin product/variant CRUD guardrails and test expectations.
- 2026-04-09: Implemented Story 6.1 route hardening, persisted product audit trail, audit retrieval endpoint, and node-test coverage; story moved to `review`.
- 2026-04-09: Applied CR-driven hardening fixes for variant ownership, audit retention, slug-race handling, stricter payload validation, and additional test coverage.

## Story Context Status

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story implementation completed and status set to `review`.
