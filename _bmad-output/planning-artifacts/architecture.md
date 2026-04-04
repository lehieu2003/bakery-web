---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/project-context.md'
  - 'docs/index.md'
  - 'docs/architecture.md'
workflowType: 'architecture'
project_name: 'bakery-web'
user_name: 'hieu'
date: '2026-04-04'
lastStep: 8
status: 'complete'
completedAt: '2026-04-04'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The product requires end-to-end capabilities across identity, discovery, cart/checkout/orders, loyalty/reorder, content/notifications, admin operations, and support/governance. Architecturally, this implies clear module boundaries, consistent API contracts, and domain-driven separation of customer-facing and admin-facing concerns while preserving shared business invariants.

**Non-Functional Requirements:**
Architecture must satisfy measurable targets for:

- Performance (p95 page/API latency, checkout completion time)
- Reliability (99.9% availability, low order failure rate, high reconciliation success)
- Security (RBAC enforcement, secure session/token handling, audit trails)
- Scalability (10x baseline growth, graceful degradation under peak load)
- Accessibility (WCAG 2.1 AA baseline)
- Integration robustness (retry/fallback + operational visibility)

**Scale & Complexity:**
This is a brownfield full-stack web application with medium-high complexity due to transactional correctness and multi-surface operations (storefront + admin + support).

- Primary domain: web commerce platform
- Complexity level: medium-high
- Estimated architectural components: 10-14 bounded modules/services within a modular monolith

### Technical Constraints & Dependencies

- Existing runtime stack must be preserved: Next.js App Router, React, TypeScript, Prisma, PostgreSQL.
- Existing integration dependencies are MVP-critical: MoMo, ZaloPay, Cloudinary, Email/SMS.
- Existing API response contract and session/RBAC patterns must remain consistent to avoid frontend/admin regressions.
- Payment callback and order-state consistency are non-negotiable architectural constraints.

### Cross-Cutting Concerns Identified

- Authentication/authorization and role enforcement across customer/admin surfaces
- Idempotency and reconciliation for payment/order flows
- Observability and auditability for critical operational actions
- Error handling and contract consistency across all APIs
- Performance budgets on purchase-critical paths
- Accessibility and responsive behavior across supported browsers/devices

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web commerce platform (Next.js App Router + React + TypeScript + Prisma + PostgreSQL) based on existing brownfield codebase.

### Starter Options Considered

1. **Retain Existing Brownfield Baseline (Recommended)**
   - Keep current repository structure and conventions.
   - Avoid migration risk and regression from re-scaffolding.

2. **create-next-app (Reference Only)**
   - Current official option for new greenfield Next.js projects.
   - Useful only if creating new modules/repo from scratch.

### Selected Starter: Existing Brownfield Baseline (No Re-bootstrap)

**Rationale for Selection:**

- Existing architecture, APIs, auth/session, and integrations are already implemented and aligned with PRD scope.
- Re-scaffolding would introduce unnecessary migration overhead and compatibility risk.
- Priority is architectural hardening and modularization within current codebase, not template replacement.

**Initialization Command:**

```bash
N/A (brownfield project - no starter bootstrap command executed)
```

**Reference Greenfield Command (if needed for parallel prototype/sandbox):**

```bash
npx create-next-app@latest <project-name>
```

**Architectural Decisions Provided by Current Baseline:**

**Language & Runtime:**

- TypeScript + React 19 + Next.js 16 App Router on Node runtime.

**Styling Solution:**

- Tailwind CSS v4 + existing design tokens and component conventions.

**Build Tooling:**

- Next.js build/start pipeline with Prisma generation in build flow.

**Testing Framework:**

- No formal test harness currently established in project artifacts; to be addressed in architecture and implementation planning.

**Code Organization:**

- Modular monolith with separated `app`, `components`, `hooks`, `services`, `lib`, `prisma`, `types`.

**Development Experience:**

- Existing lint/build workflows and project conventions already in use by team.

**Note:** For this project, the first implementation story should focus on architecture hardening and traceable FR-to-epic decomposition, not bootstrap.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Keep a modular monolith architecture on Next.js App Router (no microservice split in MVP).
- Standardize domain boundaries and API contract consistency across storefront/admin/support surfaces.
- Enforce idempotent payment callback processing and reconciliation as core transaction integrity mechanism.
- Preserve RBAC + session security model and make authorization checks explicit at API boundaries.
- Define observability baseline (request tracing, payment/order lifecycle logs, admin audit events).

**Important Decisions (Shape Architecture):**

- Keep Prisma + PostgreSQL as single source of truth for transactional domains.
- Use layered module pattern: route handlers -> domain services -> repositories/data access -> shared infrastructure.
- Introduce explicit domain modules: Auth, Catalog, Cart/Checkout, Orders/Payments, Membership, CMS/Blog, Notifications, Admin Ops.
- Add asynchronous job/retry lane for callback reconciliation and outbound notifications.

**Deferred Decisions (Post-MVP):**

- Service decomposition by domain.
- Event streaming platform adoption.
- Advanced experimentation platform for personalization/CLV optimization.

### Data Architecture

- **Primary datastore:** PostgreSQL via Prisma (retain existing).
- **Modeling approach:** Domain-first relational model with strict invariants for order/payment state transitions.
- **Validation strategy:** Input validation at API boundary + domain-level invariant checks in service layer.
- **Migration strategy:** Prisma migrations as single migration source; backward-compatible schema changes during MVP.
- **Caching strategy:** Start with selective read caching (catalog/list endpoints), avoid cache on transactional write paths.

### Authentication & Security

- **Authentication method:** Session-oriented auth with bearer fallback for non-browser clients (preserve existing pattern).
- **Authorization pattern:** Role-based authorization (ADMIN/CUSTOMER) enforced in route-level guards and service-level checks for sensitive operations.
- **Security middleware:** Centralized auth verification, rate limiting on auth/payment endpoints, standardized error envelope.
- **Data protection:** TLS in transit, least-privilege DB access, auditable admin action logging.
- **Payment security:** Idempotency keys + replay-safe callback handling + reconciliation jobs.

### API & Communication Patterns

- **API style:** RESTful route handlers with consistent response shape (`success`, `data`, `error`).
- **Documentation strategy:** Keep API contract docs aligned with FR/NFR and architecture module boundaries.
- **Error handling:** Unified error taxonomy and status mapping; no raw internal errors to clients.
- **Rate limiting:** Apply targeted rate limits to auth, checkout, payment callback, and notification-trigger endpoints.
- **Inter-module communication:** Internal service interfaces inside modular monolith; avoid hidden cross-domain DB writes.

### Frontend Architecture

- **State strategy:** React Query for server-state orchestration; local UI state kept component-scoped.
- **Component strategy:** Maintain existing separation (`components/ui`, `components/screens`, `components/admin`) with stricter domain ownership rules.
- **Routing strategy:** Hybrid SSR/CSR aligned to SEO + transactional UX requirements.
- **Performance strategy:** Budget-driven optimization on discovery + checkout routes; defer heavy non-critical assets.
- **Accessibility strategy:** WCAG 2.1 AA enforcement on purchase/account critical flows.

### Infrastructure & Deployment

- **Deployment model:** Continue current Next.js production pipeline with Prisma generation in build.
- **Environment strategy:** Strict environment separation with validated runtime config for payments/integrations.
- **Monitoring/logging:** Add structured logs and alerting for payment callbacks, order state mismatches, and integration failures.
- **Scalability approach:** Vertical + horizontal scaling within monolith boundary before decomposition.
- **Reliability controls:** Health checks, retry policies, dead-letter style handling for failed async tasks.

### Decision Impact Analysis

**Implementation Sequence:**

1. Formalize module boundaries and ownership map.
2. Harden payment/order integrity path (idempotency + reconciliation + logging).
3. Standardize API contract/error handling across all route groups.
4. Add observability + audit trail baseline.
5. Optimize performance hotspots on storefront and checkout paths.

**Cross-Component Dependencies:**

- Payment reliability depends on Orders + Payments + Notifications module coordination.
- Admin operability depends on shared audit/authorization infrastructure.
- Personalization/reorder velocity depends on Catalog + Membership + Order history consistency.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
10 areas where AI agents could make different choices and introduce integration conflicts.

### Naming Patterns

**Database Naming Conventions:**

- Tables: `snake_case` plural (e.g., `product_attributes`).
- Columns: `snake_case` (e.g., `created_at`, `user_id`).
- Foreign keys: `<entity>_id` (e.g., `order_id`, `category_id`).
- Prisma model names remain `PascalCase`; mapped DB objects follow schema conventions.

**API Naming Conventions:**

- Route groups: lowercase, kebab-case where needed.
- Resource segments: plural nouns for collections (e.g., `/api/admin/products`), identifier segment for single resources (`/[id]` or `/[slug]`).
- Query params: `camelCase` in request layer for frontend consistency.
- Response envelope: always `{ success, data?, error? }`.

**Code Naming Conventions:**

- Components: `PascalCase` (`ProductListView.tsx`).
- Hooks: `use-*.ts` or `use*.ts` aligned with existing directory conventions.
- Service files: `*.service.ts`.
- Utility modules: kebab/specific domain naming in `lib/`.
- Variables/functions: `camelCase`; constants `UPPER_SNAKE_CASE`.

### Structure Patterns

**Project Organization:**

- Keep modular monolith separation by domain:
  - Route handlers: `app/api/**/route.ts`
  - Client services: `services/**`
  - Hooks/orchestration: `hooks/**`
  - Shared infra/domain utilities: `lib/**`
- Preserve clear separation between storefront (`app/(web)`), admin (`app/admin`), and API layers.

**File Structure Patterns:**

- New domain capabilities should touch:
  - API surface (`app/api/...`)
  - Service interface (`services/...`)
  - Hook adapter (`hooks/...`) when needed by UI
- Shared types must live in `types/api.types.ts` or strongly scoped type modules.
- Avoid cross-domain helper drift; place helper logic in closest domain module first.

### Format Patterns

**API Response Formats:**

- Success:
  - `{ success: true, data: { ... } }`
- Failure:
  - `{ success: false, error: "<message>" }`
- No raw framework/internal error payloads exposed to clients.

**Data Exchange Formats:**

- Public/client JSON fields: `camelCase`.
- Timestamps serialized as ISO-8601 strings at API boundaries.
- Pagination shape standardized:
  - `{ page, limit, total, totalPages }`
- Optional values explicit (`null` or omitted) per existing endpoint behavior.

### Communication Patterns

**Event/Async Processing Patterns:**

- For callback/retry workflows, use explicit operation naming:
  - `payment.callback.received`
  - `payment.reconciliation.completed`
- Async job payloads must include correlation keys (`orderId`, `transactionId`, `attempt`).

**State Management Patterns:**

- Server state: React Query only.
- Query keys grouped by feature namespace (`admin`, `products`, etc.).
- Mutations must invalidate impacted query keys deterministically.
- Local UI-only state stays component-scoped.

### Process Patterns

**Error Handling Patterns:**

- Route handlers map known failures to stable status codes and user-safe messages.
- Auth failures normalized (`401/403`) with no stack leakage.
- Domain/service errors translated once at API boundary.

**Loading/Retry Patterns:**

- Core read queries: bounded retry policy.
- Mutations: no blind retries for non-idempotent actions unless explicitly safe.
- Payment/order write paths require idempotency guard before retry.

### Enforcement Guidelines

**All AI Agents MUST:**

- Preserve route -> service -> domain utility layering.
- Preserve API envelope and status mapping conventions.
- Implement idempotency + reconciliation in payment/order critical flows.
- Add/maintain auditability for privileged admin mutations.
- Keep FR/NFR traceability in code changes and tests.

**Pattern Enforcement:**

- PR review checklist must validate naming, layering, API shape, and idempotency rules.
- Violations are corrected in the same change-set before merge.
- Pattern updates require architecture doc update first, then implementation.

### Pattern Examples

**Good Examples:**

- `app/api/admin/products/route.ts` -> `services/admin/products.service.ts` -> `lib/prisma.ts`
- Query key pattern: `['admin', 'products', 'list', params]`
- Error response pattern: `return NextResponse.json({ success: false, error: '...' }, { status: 400 })`

**Anti-Patterns:**

- Direct DB calls from UI hook/component bypassing API/service boundaries.
- Inconsistent response shapes across endpoints.
- Payment callback logic without idempotency/correlation keys.
- Cross-domain writes hidden in unrelated modules.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
bakery-web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── prisma.config.ts
├── components.json
├── .env.example
├── app/
│   ├── layout.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── (web)/
│   │   ├── page.tsx
│   │   ├── auth/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/
│   │   │   ├── info/page.tsx
│   │   │   ├── payment/page.tsx
│   │   │   └── success/page.tsx
│   │   ├── products/[id]/page.tsx
│   │   ├── categories/[...slug]/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   ├── profile/page.tsx
│   │   └── search/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── products/page.tsx
│   │   ├── products/new/page.tsx
│   │   ├── products/[id]/edit/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── menu/page.tsx
│   │   ├── pages/page.tsx
│   │   ├── blog/posts/page.tsx
│   │   ├── blog/categories/page.tsx
│   │   ├── blog/tags/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── membership/page.tsx
│   │   ├── settings/page.tsx
│   │   └── banners/page.tsx
│   └── api/
│       ├── auth/**/route.ts
│       ├── admin/**/route.ts
│       ├── public/**/route.ts
│       ├── orders/route.ts
│       ├── wishlist/route.ts
│       ├── notifications/**/route.ts
│       ├── payment/**/callback/route.ts
│       ├── upload/**/route.ts
│       └── chat/route.ts
├── components/
│   ├── ui/
│   ├── ui-custom/
│   ├── web/
│   ├── admin/
│   └── screens/
├── hooks/
│   ├── *.ts
│   └── admin/*.ts
├── services/
│   ├── *.service.ts
│   └── admin/*.service.ts
├── lib/
│   ├── prisma.ts
│   ├── session.ts
│   ├── rate-limit.ts
│   ├── slug.ts
│   ├── product-attributes.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── index.ts
│   └── payment/
│       ├── momo.ts
│       └── zalopay.ts
├── providers/
│   ├── auth-provider.tsx
│   └── query-provider.tsx
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/**
├── types/
│   ├── api.types.ts
│   └── index.ts
├── styles/
│   └── globals.css
├── public/
└── docs/
```

### Architectural Boundaries

**API Boundaries:**

- `/api/public/*`: storefront consumption only (read-dominant, safe exposure)
- `/api/auth/*`: identity/session lifecycle
- `/api/admin/*`: privileged operational surface (RBAC-enforced)
- `/api/payment/*`: callback and reconciliation boundary
- `/api/orders`, `/api/wishlist`, `/api/notifications`: customer transactional/engagement boundary

**Component Boundaries:**

- `components/ui/*`: design primitives and reusable atomic controls
- `components/screens/*`: journey-level composition
- `components/admin/*`: admin domain composition
- No direct DB or side effects inside presentation components.

**Service Boundaries:**

- `services/*` and `services/admin/*` are client-facing API orchestration only.
- Domain-critical invariants remain in API/service layer on server side (`app/api` + `lib`).

**Data Boundaries:**

- Prisma is single write authority (`lib/prisma.ts` + `prisma/schema.prisma`).
- Transactional integrity (orders/payments) enforced at server-side domain boundaries.
- Async reconciliation/notification processing treated as separate operational lane.

### Requirements to Structure Mapping

**Feature/FR Mapping:**

- Identity (FR1-FR5): `app/api/auth/*`, `lib/session.ts`, `services/auth.service.ts`, `hooks/use-auth.ts`
- Discovery (FR6-FR11): `app/(web)/*`, `app/api/public/products*`, `services/product.service.ts`
- Checkout/Orders (FR12-FR18): `app/(web)/cart`, `app/(web)/checkout/*`, `app/api/orders`, `app/api/payment/*`, `lib/payment/*`
- Loyalty/Reorder (FR19-FR22): membership hooks/services + recommendation surfaces in `screens` and public API
- Content/Comms (FR23-FR26): `app/api/blog/*`, `app/api/notifications/*`, CMS pages under `(web)` and admin modules
- Admin ops (FR27-FR36): `app/admin/**`, `app/api/admin/**`, `services/admin/**`, `hooks/admin/**`
- Support/Governance (FR37-FR40): admin order/payment visibility + audit/logging touchpoints in API/lib layers

**Cross-Cutting Concerns:**

- Auth/RBAC: `lib/session.ts` + admin route guards
- API contract consistency: all route handlers return envelope shape
- Auditability: privileged admin mutation paths
- Observability/reconciliation: payment callback and order transition paths

### Integration Points

**Internal Communication:**

- UI -> hooks -> services -> API routes -> domain utilities -> Prisma
- React Query cache invalidation is canonical read-model refresh mechanism.

**External Integrations:**

- Payment providers: MoMo/ZaloPay callback ingestion at API boundary
- Media: Cloudinary in upload/media workflows
- Messaging: Email/SMS notification providers

**Data Flow:**

- Transaction-critical flow: checkout request -> order create -> payment callback -> reconciliation -> notification
- Read flows: public catalog/content endpoints cached selectively, transactional writes uncached.

### File Organization Patterns

**Configuration Files:**

- Root-level runtime/build/lint configs, env examples, and Prisma config.
- Keep integration credentials in environment variables only.

**Source Organization:**

- Route-centric API + domain module split.
- Domain-specific logic in `lib` and server-side route handlers.
- Client orchestration in `services`/`hooks`.

**Test Organization:**

- Recommended (to be created): `tests/unit`, `tests/integration`, `tests/e2e` with domain-focused suites.

**Asset Organization:**

- Static assets in `public/`; dynamic media references via Cloudinary URLs.

### Development Workflow Integration

**Development Server Structure:**

- Next.js app router local dev via `npm run dev` with shared module boundaries preserved.

**Build Process Structure:**

- Build pipeline includes Prisma client generation before Next build.

**Deployment Structure:**

- Environment-separated deployments with strict config validation for DB/payment/integration variables.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

- Core stack decisions are internally compatible: Next.js App Router + React + TypeScript + Prisma + PostgreSQL.
- Security, reliability, and integration decisions do not conflict with current brownfield constraints.
- Modular monolith decision aligns with MVP scope and existing codebase reality.

**Pattern Consistency:**

- Naming, structure, API envelope, and error-handling patterns align across route/service/lib boundaries.
- Payment idempotency + reconciliation patterns are consistent with reliability requirements.
- React Query orchestration pattern aligns with frontend/service boundary decisions.

**Structure Alignment:**

- Proposed project tree maps directly to existing repository layout with minimal disruptive change.
- Boundaries between storefront, admin, API, and shared domain utilities are explicit and enforceable.
- Integration points are placed at API/domain boundaries, not in UI components.

### Requirements Coverage Validation ✅

**Feature Coverage:**

- All FR categories (identity, discovery, checkout/orders, loyalty, content/comms, admin ops, support/governance) have architectural homes and boundaries.
- Transaction-critical paths (order/payment/notification) have dedicated integrity and observability controls.

**Functional Requirements Coverage:**

- FR1-FR40 are architecturally covered by module assignments, boundary definitions, and communication patterns.
- No critical FR appears orphaned from structure or decision set.

**Non-Functional Requirements Coverage:**

- Performance targets addressed via route strategy, caching constraints, and hotspot optimization path.
- Security targets addressed via RBAC/session controls, API boundary checks, and auditability.
- Reliability/scalability addressed via idempotency, reconciliation, retry lanes, and degradation strategy.
- Accessibility/integration requirements are explicitly represented in architecture constraints.

### Implementation Readiness Validation ✅

**Decision Completeness:**

- Critical architectural decisions are explicit and implementation-usable.
- Deferred decisions are clearly separated from MVP-blocking decisions.

**Structure Completeness:**

- Directory/module structure is concrete and maps to current codebase.
- Integration points and ownership boundaries are clear enough for parallel AI-agent implementation.

**Pattern Completeness:**

- Major conflict vectors (naming, format, communication, process) are covered with enforceable rules and examples.
- Enough constraints exist to reduce cross-agent divergence risk.

### Gap Analysis Results

**Critical Gaps:**

- None blocking architecture execution inside current scope.

**Important Gaps:**

- Dedicated architecture test strategy document (unit/integration/e2e boundary ownership) should be formalized before heavy implementation.
- Explicit observability specification (metrics/log schema/alert thresholds) should be added as an implementation companion doc.

**Nice-to-Have Gaps:**

- Formal ADR index for future decision evolution.
- Optional C4 diagrams for faster onboarding.

### Validation Issues Addressed

- Resolved starter-template ambiguity by explicitly choosing brownfield baseline.
- Resolved boundary ambiguity by formal route -> service -> domain utility pattern.
- Resolved payment-critical ambiguity with mandatory idempotency/reconciliation rules.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented
- [x] Technology stack specified
- [x] Integration patterns defined
- [x] Performance/security considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component/service/data boundaries established
- [x] Integration points mapped
- [x] FR/NFR coverage mapped

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** HIGH

**Key Strengths:**

- Strong alignment between PRD requirements and architecture boundaries.
- Brownfield-aware decisions minimize migration risk.
- Explicit consistency rules reduce multi-agent implementation drift.

**Areas for Future Enhancement:**

- Add companion observability spec and architecture test-strategy artifact.
- Consider ADR formalization for post-MVP evolution.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow decisions and patterns in this architecture document as binding constraints.
- Keep module boundaries and API envelope consistency intact.
- Treat payment/order integrity controls as non-negotiable.

**First Implementation Priority:**

1. Harden payment/order reconciliation + observability baseline.
2. Enforce module boundaries and shared response/error conventions.
3. Proceed to epic/story decomposition with FR traceability.
