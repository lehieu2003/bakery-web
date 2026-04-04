# Story 2.4: CMS and Blog Content Consumption

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to access policy pages and blog articles,
so that I can understand brand information and purchasing terms.

## Acceptance Criteria

1. Given CMS pages and blog posts are published, when I open content routes, then I can read static pages and blog details with complete readable content.
2. Given blog and CMS pages are rendered, when routes are crawled or shared, then metadata/title/description are present and route conventions remain discoverable.
3. Given CMS/blog APIs are called, when responses are returned, then payloads follow standardized `{ success, data?, error? }` contract and correct status codes for not-found/error paths.
4. Given backend contract or route behavior changes for content consumption, when story is completed, then frontend service/hook/UI call sites are updated in the same story (or explicitly deferred).

## Tasks / Subtasks

- [x] Validate and harden CMS public page consumption contracts (AC: 1, 3)
- [x] Confirm `app/api/public/pages/route.ts` and `app/api/public/pages/[slug]/route.ts` only expose published pages and keep standardized envelope behavior.
- [x] Verify slug not-found paths return deterministic 404 contract and non-leaky error handling.
- [x] Ensure page data shape consumed by storefront remains backward compatible (title/slug/content/timestamps).

- [x] Validate and harden blog public consumption contracts (AC: 1, 3, 4)
- [x] Confirm `app/api/blog/posts/route.ts` and `app/api/blog/posts/[slug]/route.ts` enforce published visibility and stable pagination/filter semantics.
- [x] Verify blog detail read behavior (including view-count increment side effect) remains safe and does not break not-found/error contracts.
- [x] Align blog categories/tags public endpoints contract consistency with listing/detail consumers.

- [x] Align route and metadata conventions for discoverability (AC: 2, 4)
- [x] Ensure `app/(web)/blog/page.tsx` and `app/(web)/blog/[slug]/page.tsx` metadata conventions remain consistent with App Router best practices.
- [x] Ensure CMS static routes (`ve-chung-toi`, policy/terms pages, etc.) remain aligned with sitemap and menu discoverability expectations.
- [x] Reconcile and document public URL conventions (`/api/public/pages/*` vs `/api/blog/*`) to avoid accidental route drift.

- [x] Add tests and validations for CMS/blog consumption behavior (AC: 1, 2, 3, 4)
- [x] Add/extend route tests for public pages and blog endpoints (success, not-found, filter/pagination, envelope invariants).
- [x] Add/extend UI/service tests for blog listing/detail and CMS page data handling where behavior changed.
- [x] Validate no regressions in product-discovery/content routes, sitemap expectations, and lint/test gates.

## Dev Notes

- Epic context:
- Story 2.4 closes Epic 2 discovery surfaces by ensuring editorial/legal content consumption is stable, discoverable, and contract-safe.

- Architecture guardrails:
- Preserve layer boundaries: UI -> hooks -> services -> API routes -> Prisma/domain utils.
- No direct DB access from components/hooks.
- Preserve standardized response envelope and backward-compatible contracts.
- Preserve discoverability surfaces (metadata + sitemap + stable URL conventions) without introducing duplicate routing pipelines.

- Previous story intelligence (2.3):
- 2.3 enforced stricter API testability patterns and response envelope consistency; apply the same discipline to CMS/blog routes.
- 2.3 also validated backend/frontend sync in-story; keep this same rule for any content route contract changes.

- Current branch intelligence:
- Storefront already includes blog listing/detail screens and multiple static CMS routes under `app/(web)`.
- Public CMS pages currently use `/api/public/pages/*`, while blog currently uses `/api/blog/*`; implementation should make conventions explicit and stable rather than silently diverging.

- Latest technical specifics:
- Next.js App Router metadata should be provided via `metadata` or `generateMetadata` in server components, not both in the same segment.
- Keep metadata generation deterministic and lightweight for crawl/share surfaces.

### Project Structure Notes

- Primary touch points:
- `app/(web)/blog/page.tsx`
- `app/(web)/blog/[slug]/page.tsx`
- `components/screens/BlogScreen.tsx`
- `components/screens/BlogPostDetailScreen.tsx`
- `services/blog.service.ts`
- `hooks/use-blog.ts`
- `lib/api/endpoints.ts`
- `app/api/public/pages/route.ts`
- `app/api/public/pages/[slug]/route.ts`
- `app/api/blog/posts/route.ts`
- `app/api/blog/posts/[slug]/route.ts`
- `app/api/blog/categories/route.ts`
- `app/api/blog/tags/route.ts`
- `app/sitemap.ts`
- `tests/**` (new/extended CMS-blog contract coverage)

### Testing Requirements

- Route-level:
- Public pages and blog endpoints return deterministic envelope/status across success/not-found/error paths.
- Pagination/filter params for blog listing are validated and non-breaking.

- Service/hook/UI:
- Blog service/hook contracts remain aligned with route payload shapes.
- Blog detail and CMS page experiences preserve resilient loading/error states.

- Discoverability:
- Metadata behavior for blog list/detail and CMS pages is validated for stable title/description generation.
- Sitemap/static route expectations remain consistent after route/contract adjustments.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-24-CMS-and-Blog-Content-Consumption]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2-Product-Discovery--Content-Browsing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure--Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: _bmad-output/project-context.md#Backend-Frontend-Sync-Rules]
- [Source: _bmad-output/implementation-artifacts/2-3-product-detail-and-merchandising-blocks.md]
- [Source: https://nextjs.org/docs/14/app/api-reference/functions/generate-metadata]

## Story Context Status

- Story file created with comprehensive implementation guardrails.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Auto-selected first backlog story from sprint status: `2-4-cms-and-blog-content-consumption`.
- Loaded and analyzed epics, architecture, PRD fallback, project-context, previous story `2-3`, and recent git history for implementation guardrails.
- Inspected existing CMS/blog routes, screens, hooks/services, and endpoint constants to prevent duplicate pipelines and route-contract drift.
- Updated sprint status entry for `2-4-cms-and-blog-content-consumption` to `in-progress`.
- Refactored public CMS routes to injectable handlers and fixed published-page lookup semantics for slug detail.
- Refactored public blog list/detail routes with normalized query handling, deterministic not-found status mapping, and injectable handlers for tests.
- Enhanced blog detail metadata generation to use published post SEO/content fields.
- Extended sitemap generation to include published CMS pages and published blog post routes for discoverability consistency.
- Validation runs completed:
  - `npx tsx --test tests/content/*.test.ts`
  - `npx tsx --test tests/products/*.test.ts`
  - `npx tsx --test tests/**/*.test.ts`
  - `npm run lint` (passes with one pre-existing warning in `app/api/public/products/filters/route.ts`)

### Completion Notes List

- Implemented CMS/blog public contract hardening with deterministic status handling and preserved `{ success, data?, error? }` envelope.
- Implemented metadata and sitemap discoverability updates for blog/CMS surfaces without introducing duplicate routing pipelines.
- Added route-level test coverage for pages/blog list/blog detail handlers, including invalid input and not-found cases.
- Completed regression/lint validation gates with full test suite passing.

### File List

- _bmad-output/implementation-artifacts/2-4-cms-and-blog-content-consumption.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/api/public/pages/route.ts
- app/api/public/pages/[slug]/route.ts
- app/api/blog/posts/route.ts
- app/api/blog/posts/[slug]/route.ts
- app/(web)/blog/[slug]/page.tsx
- app/sitemap.ts
- tests/content/public-pages-routes.test.ts
- tests/content/public-blog-posts-routes.test.ts
- tests/content/public-blog-post-detail-route.test.ts

## Change Log

- 2026-04-04: Implemented Story 2.4 CMS/blog contract hardening, metadata/sitemap discoverability updates, and added content route test coverage.
