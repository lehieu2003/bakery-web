---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - '_bmad-output/project-context.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture.md'
  - 'docs/source-tree-analysis.md'
  - 'docs/api-contracts.md'
  - 'docs/data-models.md'
  - 'docs/component-inventory.md'
  - 'docs/development-guide.md'
  - 'docs/deployment-guide.md'
  - 'docs/contribution-guide.md'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 11
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - bakery-web

**Author:** hieu
**Date:** 2026-04-04

## Executive Summary

bakery-web is a brownfield web application focused on improving repeat purchase and operational efficiency for a bakery business. The product serves two primary user groups: retail customers who need fast product discovery and checkout, and internal operators who need centralized catalog/content/order management in admin workflows.
The core product goal is to reduce friction from first intent to completed order, then make re-ordering materially easier than competitors through contextual recommendations and membership-aware incentives.

### What Makes This Special

The key differentiator is the combination of personalized commerce and loyalty-driven re-engagement in one integrated flow. Returning users should see relevant products, bundles, and incentives based on prior behavior and membership status, creating a clear "faster and more relevant on every repeat visit" experience.
The core insight is that bakery growth depends more on repeat-order velocity and retention quality than one-time acquisition alone. Therefore, product decisions prioritize re-order convenience, targeted promotion timing, and a consistent post-purchase loop.

## Project Classification

- Project Type: **web_app**
- Domain: **general** (e-commerce / bakery retail operations)
- Complexity: **medium**
- Project Context: **brownfield**

## Success Criteria

### User Success

- Checkout completion rate >= 55%
- Cart abandonment reduced by >= 20% from current baseline
- 30-day reorder rate >= 25%
- Median order completion time (add-to-cart to successful order) <= 3 minutes
- Logged-in users applying at least one member benefit >= 35%

### Business Success

- 3 months:
  - Online orders increase >= 30%
  - Online revenue increase >= 25%
  - Repeat customer rate increase >= 20%
- 12 months:
  - >= 50% of online revenue from returning customers
  - AOV increase >= 15%
  - Active membership users >= 40% of total online customers

### Technical Success

- Uptime >= 99.9%
- p95 page load <= 2.5s (home, category, product detail pages)
- p95 API latency <= 400ms for read APIs, <= 700ms for write APIs
- Order placement failure rate < 1%
- Payment callback success reconciliation >= 99.5%

### Measurable Outcomes

- Increase repeat purchase velocity through personalized recommendations and member incentives
- Reduce checkout friction through shorter flow, clear state feedback, and lower error frequency
- Improve admin operating efficiency through centralized catalog/content/order management

## Product Scope

### MVP - Minimum Viable Product

- Stable product discovery + search + category browsing
- Cart + checkout end-to-end
- Core auth + profile
- Membership level/points visibility and basic incentive application
- Admin management for products, categories, orders, banners, and core content
- Baseline KPI tracking (conversion, reorder, abandonment)

### Growth Features (Post-MVP)

- Advanced behavior-based personalized bundles/recommendations
- Campaign automation by membership segment
- Enhanced blog/content and SEO workflows
- Enhanced notification targeting and read analytics
- Expanded payment optimization and retry/fallback flows

### Vision (Future)

- Predictive reorder and time-optimized incentives
- Omnichannel loyalty orchestration (web + social/chat)
- AI-assisted merchandising for admin
- Cohort-based CLV optimization with experimentation framework

## User Journeys

### Journey 1: First-Time Customer (Success Path)

- Opening scene: Lan sees a social post about fresh cakes and opens the site with low trust and high comparison behavior.
- Rising action: She browses categories, checks product detail, sees clear pricing and delivery info, adds items to cart, and completes checkout.
- Climax: Payment succeeds on first attempt, and she immediately receives order confirmation with clear next steps.
- Resolution: Lan feels the process was simple and transparent, so she is willing to return for her next order.

### Journey 2: Returning Member Customer (Retention / Reorder Path)

- Opening scene: Minh already bought before and wants a fast reorder, not a full discovery flow.
- Rising action: He logs in, sees member status, points, and personalized recommendations/bundles aligned with past purchases.
- Climax: He uses a member incentive and completes reorder in under 3 minutes.
- Resolution: Minh experiences "faster and more relevant every visit," reinforcing loyalty and repeat purchase behavior.

### Journey 3: Admin Operations User (Catalog + Orders Management)

- Opening scene: The admin starts the day needing to update products, banners, and monitor incoming orders.
- Rising action: They adjust product/category data, update promotional content, and process orders through status transitions.
- Climax: High-priority orders are handled without delay, and pricing/content changes are reflected correctly on storefront.
- Resolution: Operations stay controlled from one place, reducing manual coordination and response time.

### Journey 4: Customer Support Staff (Issue Resolution Path)

- Opening scene: A customer contacts support about a failed payment callback or unclear order status.
- Rising action: Support checks order, payment, and notification history from admin views, then guides the customer through recovery steps.
- Climax: The issue is resolved (retry/payment confirmation/order status correction) without losing the order.
- Resolution: Customer trust is retained; support has a repeatable troubleshooting flow instead of ad-hoc handling.

### Journey Requirements Summary

- Fast discovery + checkout with clear shipping/payment visibility.
- Low-friction reorder flow for logged-in members with incentive application.
- Centralized admin capabilities for catalog/content/order lifecycle.
- Support-ready observability for payment/order/notification troubleshooting.
- Reliable status and confirmation messaging across key customer moments.
- Error recovery paths for payment or checkout failures without abandoning intent.

## Domain-Specific Requirements

### Compliance & Regulatory

- Baseline legal compliance: clear Privacy Policy, Terms of Use, and explicit user consent handling for personal data.
- Maintain lightweight admin audit trail for critical operational changes (catalog, pricing, order status updates).

### Technical Constraints

- Priority 1: payment callback reliability and order finalization consistency.
- Priority 2: checkout performance and API responsiveness at purchase-critical touchpoints.
- Priority 3: admin security controls including RBAC, secure session handling, and restricted access paths.

### Integration Requirements

- MVP-required integrations: MoMo, ZaloPay, Cloudinary, Email/SMS notification channels.
- Scope control: prioritize transaction stability and delivery of order notifications; defer non-essential gateway expansion post-MVP.

### Risk Mitigations

- Highest risk: payment failure or callback mismatch with order state.
- Secondary risk: delayed/inconsistent order status communication causing support load and trust erosion.
- Third risk: inventory mismatch for fast-moving bakery products during peak windows.

## Web App Specific Requirements

### Project-Type Overview

- Architecture style: hybrid SSR/CSR web app (Next.js App Router), prioritizing SEO discovery pages and fast transactional flows.
- Delivery target: responsive browser-first experience for storefront + admin back office.
- Scope excludes native-only capabilities and CLI workflows.

### Technical Architecture Considerations

- SPA/MPA strategy: hybrid route model.
  - SEO-critical pages (home, category, product detail, policy/content pages): server-render friendly.
  - Interaction-heavy authenticated/admin screens: client-interactive with cached API access.
- Browser support baseline:
  - Desktop: latest 2 versions of Chrome, Edge, Safari, Firefox.
  - Mobile web: latest 2 versions iOS Safari + Android Chrome.
- Real-time requirement level: light real-time (notification/order status freshness), no hard real-time streaming dependency for MVP.

### Browser Matrix

- Tier 1 (full support): Chrome, Edge, Safari, Firefox (modern versions).
- Tier 2 (graceful degradation): older browsers outside support window with core checkout still functional where feasible.
- Non-goal: legacy IE-class support.

### Responsive Design

- Mobile-first storefront layout.
- Breakpoints must preserve checkout usability and readable product detail.
- Admin UI optimized for desktop/tablet; mobile admin support is secondary.

### Performance Targets

- p95 page load <= 2.5s for key storefront pages.
- p95 API latency <= 400ms (read), <= 700ms (write) on core purchase flows.
- Cart/checkout interactions should avoid blocking re-renders and minimize round trips.

### SEO Strategy

- Indexable product/category/content routes with metadata, sitemap, robots handling.
- Clean URL structure for category/product content.
- Content pages (blog/policy/about) support organic discovery and retention loops.

### Accessibility Level

- Target WCAG 2.1 AA baseline for core purchase and account flows.
- Mandatory keyboard accessibility and visible focus states for primary interactions.
- Form validation/error states must be perceivable and screen-reader understandable.

### Implementation Considerations

- Maintain consistent API response contract (`success/data/error`) across routes.
- Keep auth/session security controls for admin and customer areas (RBAC + secure sessions).
- Treat payment callback reconciliation and order-state consistency as first-class reliability concerns.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

- **MVP Approach:** Problem-solving + experience MVP (prove reorder speed + checkout reliability).
- **Resource Requirements:**
  - Minimum team: 1 FE, 1 BE/fullstack, 1 QA (shared), 1 PM/BA (part-time).
  - Optional: 1 designer part-time for conversion/UX tuning.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- First-time customer purchase flow.
- Returning member reorder flow.
- Admin catalog/order operation flow.
- Support troubleshooting for payment/order-state issues.

**Must-Have Capabilities:**
- Product discovery/search/category + product detail.
- Cart + checkout + order confirmation.
- Auth/profile + membership point/level display + basic incentives.
- Admin CRUD for products/categories/banners/orders/pages basic.
- Payment integrations: MoMo + ZaloPay callback reconciliation.
- Notification delivery (email/SMS baseline).
- KPI tracking for conversion/reorder/abandonment.

### Post-MVP Features

**Phase 2 (Post-MVP):**
- Advanced personalization bundles/recommendations.
- Campaign automation by member segments.
- Enhanced blog/SEO and notification analytics.
- Payment retry/fallback improvements.

**Phase 3 (Expansion):**
- Predictive reorder and time-based incentive optimization.
- AI-assisted merchandising in admin.
- Cohort-based CLV experimentation framework.
- Omnichannel loyalty orchestration.

### Risk Mitigation Strategy

- **Technical Risks:** callback mismatch/order inconsistency -> idempotent callback processing, reconciliation jobs, order-state audit logs.
- **Market Risks:** low repeat adoption -> validate with cohort KPIs (30-day reorder, member incentive usage), run A/B on recommendation + offers.
- **Resource Risks:** under-capacity -> freeze MVP scope to checkout reliability + reorder loop; defer automation and advanced targeting to Phase 2.

## Functional Requirements

### Customer Account & Identity
- FR1: Visitor can register account with email verification.
- FR2: User can sign in and sign out securely.
- FR3: User can reset forgotten password via OTP verification.
- FR4: User can view and update basic profile information.
- FR5: System can identify user membership level and points status.

### Product Discovery & Merchandising
- FR6: Visitor can browse products by category hierarchy.
- FR7: Visitor can search products by keyword.
- FR8: Visitor can filter products by relevant criteria (price/attributes/availability).
- FR9: Visitor can view product detail including images, price, variants, and key info.
- FR10: System can present related or recommended products for discovery.
- FR11: System can surface best-seller or featured product collections.

### Cart, Checkout & Orders
- FR12: User can add, update, and remove items in cart.
- FR13: User can place an order with delivery and customer information.
- FR14: User can choose supported payment method at checkout.
- FR15: System can finalize order state based on payment callback outcomes.
- FR16: User can receive order confirmation after successful placement.
- FR17: User can view order history and order status progression.
- FR18: System can preserve order integrity during payment or callback edge cases.

### Loyalty, Promotions & Reorder
- FR19: User can see applicable membership benefits during purchase flow.
- FR20: System can apply eligible incentives to reduce repeat-order friction.
- FR21: Returning user can quickly reorder from prior purchase context.
- FR22: System can provide personalized product suggestions based on prior behavior.

### Content, Communication & Engagement
- FR23: Visitor can access CMS pages (policy/about/terms/privacy).
- FR24: Visitor can browse and read blog content.
- FR25: System can deliver notifications to users about relevant events.
- FR26: User can mark notifications as read and manage read state.

### Admin Catalog & Content Operations
- FR27: Admin can create/update/delete products and product variants.
- FR28: Admin can manage product categories including hierarchy and ordering.
- FR29: Admin can manage banners and promotional display content.
- FR30: Admin can manage static pages and menu structure.
- FR31: Admin can manage blog posts, categories, and tags.
- FR32: Admin can manage product attributes and filter metadata.

### Admin Order, Customer & Business Operations
- FR33: Admin can view and update order lifecycle statuses.
- FR34: Admin can view customer data relevant to service and operations.
- FR35: Admin can configure membership and store settings.
- FR36: Admin can view dashboard-level operational and sales indicators.

### Support, Governance & Reliability
- FR37: Support/admin can investigate payment and order-state discrepancies.
- FR38: System can maintain audit visibility for critical admin changes.
- FR39: System can enforce role-based access boundaries for admin capabilities.
- FR40: System can provide consistent API response contracts for client operations.

## Non-Functional Requirements

### Performance
- NFR1: p95 page load for key storefront pages (home/category/product) must be <= 2.5 seconds under normal operating load.
- NFR2: p95 API latency must be <= 400ms for read endpoints and <= 700ms for write endpoints in core purchase flows.
- NFR3: Median end-to-end checkout completion time for successful orders must be <= 3 minutes.
- NFR4: Product search and filter interactions must return results without blocking UI responsiveness on supported browsers.

### Security
- NFR5: All authentication/session tokens must be protected in transit and handled with secure cookie/header practices.
- NFR6: Access to admin capabilities must enforce role-based authorization checks on every protected API/action.
- NFR7: Sensitive data transmission must use TLS; sensitive persistence must follow encryption and least-privilege access controls.
- NFR8: Critical admin actions (catalog/pricing/order status changes) must be auditable with actor + timestamp traceability.
- NFR9: Payment callback processing must be idempotent and protected against replay/duplication effects.

### Reliability
- NFR10: System availability target must be >= 99.9% monthly for customer-facing purchase capabilities.
- NFR11: Order placement failure rate must remain < 1% for valid checkout attempts.
- NFR12: Payment callback reconciliation success rate must be >= 99.5%.
- NFR13: Order and payment state transitions must remain consistent after retries/recovery flows.

### Scalability
- NFR14: The system must support at least 10x growth from initial traffic baseline without requiring full architectural rewrite.
- NFR15: Peak traffic windows (campaign/holiday) must degrade gracefully without total checkout outage.
- NFR16: Background reconciliation and notification workloads must remain isolated from critical checkout path performance.

### Accessibility
- NFR17: Core purchase/account flows must meet WCAG 2.1 AA baseline.
- NFR18: Keyboard navigation and visible focus indication must be supported across critical interactions.
- NFR19: Form errors and status messages must be perceivable by screen readers.

### Integration
- NFR20: External integrations (MoMo, ZaloPay, Cloudinary, Email/SMS) must have monitored failure handling and retry/fallback where applicable.
- NFR21: Integration failures must surface actionable operational signals for admin/support teams.
- NFR22: API contracts between frontend and backend must remain version-safe for MVP and planned post-MVP enhancements.
