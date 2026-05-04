---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# bakery-web - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bakery-web, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Visitor can register account with email verification.
FR2: User can sign in and sign out securely.
FR3: User can reset forgotten password via OTP verification.
FR4: User can view and update basic profile information.
FR5: System can identify user membership level and points status.
FR6: Visitor can browse products by category hierarchy.
FR7: Visitor can search products by keyword.
FR8: Visitor can filter products by relevant criteria (price/attributes/availability).
FR9: Visitor can view product detail including images, price, variants, and key info.
FR10: System can present related or recommended products for discovery.
FR11: System can surface best-seller or featured product collections.
FR12: User can add, update, and remove items in cart.
FR13: User can place an order with delivery and customer information.
FR14: User can choose supported payment method at checkout.
FR15: System can finalize order state based on payment callback outcomes.
FR16: User can receive order confirmation after successful placement.
FR17: User can view order history and order status progression.
FR18: System can preserve order integrity during payment or callback edge cases.
FR19: User can see applicable membership benefits during purchase flow.
FR20: System can apply eligible incentives to reduce repeat-order friction.
FR21: Returning user can quickly reorder from prior purchase context.
FR22: System can provide personalized product suggestions based on prior behavior.
FR23: Visitor can access CMS pages (policy/about/terms/privacy).
FR24: Visitor can browse and read blog content.
FR25: System can deliver notifications to users about relevant events.
FR26: User can mark notifications as read and manage read state.
FR27: Admin can create/update/delete products and product variants.
FR28: Admin can manage product categories including hierarchy and ordering.
FR29: Admin can manage banners and promotional display content.
FR30: Admin can manage static pages and menu structure.
FR31: Admin can manage blog posts, categories, and tags.
FR32: Admin can manage product attributes and filter metadata.
FR33: Admin can view and update order lifecycle statuses.
FR34: Admin can view customer data relevant to service and operations.
FR35: Admin can configure membership and store settings.
FR36: Admin can view dashboard-level operational and sales indicators.
FR37: Support/admin can investigate payment and order-state discrepancies.
FR38: System can maintain audit visibility for critical admin changes.
FR39: System can enforce role-based access boundaries for admin capabilities.
FR40: System can provide consistent API response contracts for client operations.

### NonFunctional Requirements

NFR1: p95 page load for key storefront pages (home/category/product) must be <= 2.5 seconds under normal operating load.
NFR2: p95 API latency must be <= 400ms for read endpoints and <= 700ms for write endpoints in core purchase flows.
NFR3: Median end-to-end checkout completion time for successful orders must be <= 3 minutes.
NFR4: Product search and filter interactions must return results without blocking UI responsiveness on supported browsers.
NFR5: All authentication/session tokens must be protected in transit and handled with secure cookie/header practices.
NFR6: Access to admin capabilities must enforce role-based authorization checks on every protected API/action.
NFR7: Sensitive data transmission must use TLS; sensitive persistence must follow encryption and least-privilege access controls.
NFR8: Critical admin actions (catalog/pricing/order status changes) must be auditable with actor + timestamp traceability.
NFR9: Payment callback processing must be idempotent and protected against replay/duplication effects.
NFR10: System availability target must be >= 99.9% monthly for customer-facing purchase capabilities.
NFR11: Order placement failure rate must remain < 1% for valid checkout attempts.
NFR12: Payment callback reconciliation success rate must be >= 99.5%.
NFR13: Order and payment state transitions must remain consistent after retries/recovery flows.
NFR14: The system must support at least 10x growth from initial traffic baseline without requiring full architectural rewrite.
NFR15: Peak traffic windows (campaign/holiday) must degrade gracefully without total checkout outage.
NFR16: Background reconciliation and notification workloads must remain isolated from critical checkout path performance.
NFR17: Core purchase/account flows must meet WCAG 2.1 AA baseline.
NFR18: Keyboard navigation and visible focus indication must be supported across critical interactions.
NFR19: Form errors and status messages must be perceivable by screen readers.
NFR20: External integrations (MoMo, ZaloPay, Cloudinary, Email/SMS) must have monitored failure handling and retry/fallback where applicable.
NFR21: Integration failures must surface actionable operational signals for admin/support teams.
NFR22: API contracts between frontend and backend must remain version-safe for MVP and planned post-MVP enhancements.

### Additional Requirements

- Brownfield baseline only; no starter template bootstrap or re-scaffolding.
- Preserve existing stack and contracts: Next.js App Router, React, TypeScript, Prisma, PostgreSQL, and `success/data/error` API response shape.
- Keep existing critical integrations (MoMo, ZaloPay, Cloudinary, Email/SMS) as MVP dependencies.
- Enforce explicit authorization at API boundaries and preserve RBAC + secure session model.
- Apply layered module pattern: route handlers -> domain services -> repositories/data access -> shared infrastructure.
- Maintain Prisma as single migration source with backward-compatible schema evolution during MVP.
- Implement payment safety controls: idempotency keys, replay-safe callback handling, and reconciliation jobs.
- Add structured audit and operational logging for payment callbacks, order-state mismatches, and integration failures.
- Enforce strict environment separation and validated runtime config for DB/payment/integration secrets.
- Keep integration credentials in environment variables only.
- Standardize async job payload correlation keys (`orderId`, `transactionId`, `attempt`).
- Define deterministic query invalidation for write operations that affect cached UI data.
- First implementation story focus: architecture hardening and FR-to-epic traceable decomposition (not project bootstrap).
- Recommended test structure to establish and use: `tests/unit`, `tests/integration`, `tests/e2e`.
- Add companion observability specification (metrics, logs schema, alert thresholds) before heavy implementation.

### UX Design Requirements

No UX design document was provided in planning artifacts, so no UX-DR items were extracted in this step.

### FR Coverage Map

FR1: Epic 1 - Account registration and identity access.
FR2: Epic 1 - Secure sign-in/out flows.
FR3: Epic 1 - OTP-based password recovery.
FR4: Epic 1 - Profile read/update.
FR5: Epic 1 - Membership level and points visibility.
FR6: Epic 2 - Category browsing.
FR7: Epic 2 - Product keyword search.
FR8: Epic 2 - Product filtering.
FR9: Epic 2 - Product detail viewing.
FR10: Epic 2 - Related/recommended products.
FR11: Epic 2 - Featured and best-seller collections.
FR12: Epic 3 - Cart item management.
FR13: Epic 3 - Checkout and order placement.
FR14: Epic 3 - Payment method selection.
FR15: Epic 3 - Callback-driven order finalization.
FR16: Epic 3 - Order confirmation.
FR17: Epic 3 - Order history and tracking.
FR18: Epic 3 - Payment/order edge-case integrity.
FR19: Epic 4 - Membership benefit visibility in purchase flow.
FR20: Epic 4 - Incentive application logic.
FR21: Epic 4 - Fast reorder from purchase history.
FR22: Epic 4 - Personalized suggestions from behavior.
FR23: Epic 2 - CMS page access.
FR24: Epic 2 - Blog browsing and reading.
FR25: Epic 5 - Notification delivery.
FR26: Epic 5 - Notification read-state management.
FR27: Epic 6 - Product and variant administration.
FR28: Epic 6 - Category hierarchy management.
FR29: Epic 6 - Banner and promo content management.
FR30: Epic 6 - Static page and menu management.
FR31: Epic 6 - Blog admin management.
FR32: Epic 6 - Attributes and filter metadata admin.
FR33: Epic 7 - Order lifecycle operations.
FR34: Epic 7 - Customer operations data access.
FR35: Epic 7 - Membership/store settings administration.
FR36: Epic 7 - Operational and sales dashboards.
FR37: Epic 8 - Payment/order discrepancy investigation.
FR38: Epic 8 - Audit visibility for critical changes.
FR39: Epic 8 - RBAC enforcement boundaries.
FR40: Epic 8 - Consistent API response contracts.

## Epic List

### Epic 1: Account & Membership Foundation

Users can register, authenticate, manage profile, and see membership status to unlock personalized experiences.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 2: Product Discovery & Content Browsing

Visitors can discover products and supporting content through category, search, filters, recommendations, featured sets, and CMS/blog pages.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR23, FR24

### Epic 3: Cart, Checkout & Order Lifecycle

Customers can build cart, place orders, pay, receive confirmation, and track order progression with payment integrity handling.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18

### Epic 4: Loyalty, Incentives & Reorder

Returning customers can apply member benefits, receive personalized suggestions, and reorder faster.
**FRs covered:** FR19, FR20, FR21, FR22

### Epic 5: Customer Notifications & Read State

Users receive relevant notifications and can manage read status.
**FRs covered:** FR25, FR26

### Epic 6: Admin Catalog & Content Management

Admin can manage products, categories, banners, pages, blog, and product attributes for storefront operations.
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32

### Epic 7: Admin Operations & Business Visibility

Admin can manage order lifecycle, customer operational views, membership/store settings, and business dashboards.
**FRs covered:** FR33, FR34, FR35, FR36

### Epic 8: Support, Governance & API Reliability

Support/admin can investigate discrepancies, maintain audit visibility, enforce RBAC boundaries, and keep API contracts consistent.
**FRs covered:** FR37, FR38, FR39, FR40

## Epic 1: Account & Membership Foundation

Establish secure customer identity, profile lifecycle, and membership visibility as the prerequisite for personalized and retention-oriented flows.

### Story 1.1: Register Account with Email Verification

As a visitor,
I want to create an account and verify my email,
So that I can access member features securely.

**Acceptance Criteria:**

**Given** I am a new visitor with a valid email
**When** I submit registration data
**Then** the system creates a pending account and sends a verification email
**And** the account cannot access authenticated routes before verification.

### Story 1.2: Secure Sign-In and Sign-Out Session Flow

As a registered user,
I want to sign in and sign out securely,
So that my account session is protected.

**Acceptance Criteria:**

**Given** my account is verified
**When** I sign in with valid credentials
**Then** the system creates a secure session and returns standardized API payload format
**And** signing out invalidates the active session and protected endpoints reject stale tokens.

### Story 1.3: OTP Password Recovery

As a user who forgot my password,
I want to reset it via OTP verification,
So that I can recover access without support intervention.

**Acceptance Criteria:**

**Given** I request password reset for a valid account
**When** I submit a correct OTP and new password
**Then** the password is updated and existing sessions are revoked
**And** invalid/expired OTP attempts return safe error responses without revealing account existence.

### Story 1.4: Profile Management and Membership Snapshot

As an authenticated user,
I want to view and update my profile and see my membership status,
So that I can maintain account data and understand available benefits.

**Acceptance Criteria:**

**Given** I am signed in
**When** I open profile settings
**Then** I can read and update allowed profile fields with validation
**And** membership tier and points are shown from authoritative backend data.

## Epic 2: Product Discovery & Content Browsing

Deliver a high-conversion discovery surface where visitors can find products and supporting content quickly across catalog and editorial entry points.

### Story 2.1: Category Browsing and Product Listing

As a visitor,
I want to browse product categories,
So that I can explore available bakery products by intent.

**Acceptance Criteria:**

**Given** product categories exist in admin-managed hierarchy
**When** I navigate a category page
**Then** I see paginated products for that category with key card information
**And** page rendering meets SEO and performance targets for key storefront routes.

### Story 2.2: Search and Filter Experience

As a visitor,
I want to search and filter products,
So that I can narrow choices quickly.

**Acceptance Criteria:**

**Given** I am on a product listing view
**When** I enter keywords and apply filters
**Then** results update with relevant products and preserved filter state
**And** interactions remain responsive without blocking UI on supported browsers.

### Story 2.3: Product Detail and Merchandising Blocks

As a visitor,
I want to view detailed product information with recommendations,
So that I can make purchase decisions confidently.

**Acceptance Criteria:**

**Given** I open a product detail page
**When** the page loads
**Then** it displays images, variants, price, and essential product details
**And** related/recommended and featured or best-seller blocks are shown with trackable impressions.

### Story 2.4: CMS and Blog Content Consumption

As a visitor,
I want to access policy pages and blog articles,
So that I can understand brand information and purchasing terms.

**Acceptance Criteria:**

**Given** CMS pages and blog posts are published
**When** I open content routes
**Then** I can read static pages and blog details with proper metadata
**And** routes use consistent URL and rendering conventions for discoverability.

## Epic 3: Cart, Checkout & Order Lifecycle

Enable end-to-end purchase flow with resilient payment handling, reliable order state transitions, and clear customer communication.

### Story 3.1: Cart Management

As a customer,
I want to add, update, and remove cart items,
So that I can prepare my order accurately.

**Acceptance Criteria:**

**Given** I browse products and variants
**When** I update cart quantities or remove items
**Then** cart totals and item states recalculate correctly
**And** cart state persists consistently across refresh and authenticated session boundaries.

### Story 3.2: Checkout Submission and Payment Method Selection

As a customer,
I want to provide delivery information and choose payment method,
So that I can place an order successfully.

**Acceptance Criteria:**

**Given** my cart has valid items
**When** I submit checkout form and payment option
**Then** the system creates a pending order with validated customer and delivery data
**And** API write latency and validation behavior meet purchase-flow constraints.

### Story 3.3: Payment Callback Finalization with Idempotency

As the platform,
I want to finalize order state from payment callbacks safely,
So that duplicate callbacks do not corrupt order outcomes.

**Acceptance Criteria:**

**Given** a payment callback is received for an existing order
**When** callback processing runs multiple times for the same transaction
**Then** idempotency controls ensure a single authoritative order/payment state
**And** all callback events are logged with correlation keys for reconciliation.

### Story 3.4: Confirmation, Order History, and Status Tracking

As a customer,
I want to receive confirmation and monitor order progress,
So that I trust the purchase process.

**Acceptance Criteria:**

**Given** an order reaches confirmed or paid status
**When** post-checkout processing completes
**Then** I receive confirmation via configured channels and can view status in order history
**And** retry/recovery flows preserve state consistency for failures and delayed callbacks.

## Epic 4: Loyalty, Incentives & Reorder

Increase repeat-order velocity by making member benefits visible, incentives applicable, and repeat purchases significantly faster.

### Story 4.1: Membership Benefit Visibility in Purchase Flow

As a returning member,
I want to see my eligible benefits during shopping and checkout,
So that I can make informed purchase decisions.

**Acceptance Criteria:**

**Given** I am logged in with a membership tier
**When** I browse cart or checkout
**Then** the system displays currently applicable member benefits and points context
**And** unavailable benefits are explained with clear eligibility messages.

### Story 4.2: Incentive Application and Validation Rules

As a member,
I want eligible incentives applied correctly,
So that my reorder friction is reduced without pricing errors.

**Acceptance Criteria:**

**Given** I meet incentive eligibility conditions
**When** I apply an incentive at checkout
**Then** order totals update correctly and discount rules are enforced server-side
**And** conflicting or invalid incentives are rejected with actionable feedback.

### Story 4.3: Quick Reorder from Prior Purchases

As a returning customer,
I want to reorder from purchase history,
So that I can complete repeat purchases quickly.

**Acceptance Criteria:**

**Given** I have previous completed orders
**When** I choose reorder on a past order
**Then** the system pre-populates a new cart with available items and variant mapping
**And** unavailable items are flagged with substitute guidance instead of silent failure.

### Story 4.4: Personalized Suggestions for Returning Users

As a returning customer,
I want recommendations based on prior behavior,
So that I can discover relevant products faster.

**Acceptance Criteria:**

**Given** I have historical purchase or browsing behavior
**When** I return to storefront surfaces
**Then** personalized suggestion blocks are rendered from defined recommendation logic
**And** recommendations degrade gracefully to generic featured items when behavior data is insufficient.

## Epic 5: Customer Notifications & Read State

Provide dependable customer communication for key events with clear notification lifecycle management.

### Story 5.1: Event-Driven Notification Delivery

As a customer,
I want to receive timely notifications for important events,
So that I stay informed about orders and account actions.

**Acceptance Criteria:**

**Given** a supported event occurs (order update, account event, campaign trigger)
**When** notification dispatch is executed
**Then** the system sends notification payloads through configured channels with retry/fallback behavior
**And** delivery failures are logged and surfaced for operations.

### Story 5.2: Notification Inbox and Read-State Management

As a customer,
I want to view and mark notifications as read,
So that I can manage my message backlog.

**Acceptance Criteria:**

**Given** I am authenticated with notification history
**When** I open notifications and mark items read
**Then** read/unread state updates are persisted and reflected in UI counters
**And** API responses use the standardized contract for client consistency.

## Epic 6: Admin Catalog & Content Management

Enable admin teams to control storefront catalog and editorial assets safely and efficiently from a centralized back office.

### Story 6.1: Product and Variant CRUD

As an admin,
I want to manage products and variants,
So that storefront offerings stay accurate.

**Acceptance Criteria:**

**Given** I have authorized admin access
**When** I create, update, or delete products/variants
**Then** changes are validated and persisted through service-layer rules
**And** critical mutations are audit-logged with actor and timestamp.

### Story 6.2: Category Hierarchy and Attribute Metadata Management

As an admin,
I want to manage category hierarchy and filter metadata,
So that product discovery structure remains coherent.

**Acceptance Criteria:**

**Given** category and attribute definitions exist
**When** I modify hierarchy/order or attribute metadata
**Then** storefront browse and filter endpoints reflect the new taxonomy
**And** changes preserve referential integrity and backward-compatible API behavior.

### Story 6.3: Banner, Static Page, and Menu Administration

As an admin,
I want to manage banners and static pages,
So that promotional and legal content stays current.

**Acceptance Criteria:**

**Given** content admin modules are available
**When** I publish or update banners/pages/menu links
**Then** storefront displays updated content in expected placements
**And** unpublished drafts are not exposed publicly.

### Story 6.4: Blog Post Administration

As an admin,
I want to manage blog posts, categories, and tags,
So that marketing content can be published consistently.

**Acceptance Criteria:**

**Given** I am in blog admin area
**When** I create or edit posts and taxonomy
**Then** content is persisted with publish controls and slug consistency
**And** public blog routes index only published posts.

## Epic 7: Admin Operations & Business Visibility

Give operations teams the control and observability needed to run order workflows and monitor commercial performance.

### Story 7.1: Order Lifecycle Operations

As an admin operator,
I want to view and update order statuses,
So that fulfillment and customer communication remain synchronized.

**Acceptance Criteria:**

**Given** orders exist across lifecycle states
**When** I transition an order status
**Then** transitions follow allowed state machine rules
**And** each status change is audit-logged and reflected in customer-facing order history.

### Story 7.2: Customer Operational View

As a support/admin user,
I want to access customer operational data,
So that I can resolve service issues quickly.

**Acceptance Criteria:**

**Given** I have appropriate RBAC permissions
**When** I open customer detail views
**Then** I can see relevant profile, order, payment, and notification context
**And** sensitive data is restricted by least-privilege access rules.

### Story 7.3: Membership and Store Settings Administration

As an admin,
I want to configure membership and store settings,
So that business rules can evolve without code deployment.

**Acceptance Criteria:**

**Given** settings modules are enabled
**When** I update membership thresholds or store-level parameters
**Then** updates are validated, versioned, and applied to eligible flows
**And** invalid configurations are blocked with clear error guidance.

### Story 7.4: Dashboard Metrics and KPI Views

As an admin,
I want dashboard visibility into sales and operations,
So that I can monitor business health.

**Acceptance Criteria:**

**Given** order and engagement data exists
**When** I open operational dashboards
**Then** key indicators (sales, conversion, order states) are displayed with defined refresh behavior
**And** data retrieval stays within agreed performance budgets.

## Epic 8: Support, Governance & API Reliability

Harden support and governance capabilities so incidents are diagnosable, privileged actions are controlled, and client integrations remain stable.

### Story 8.1: Payment and Order Discrepancy Investigation Workspace

As a support/admin user,
I want to investigate payment and order mismatches,
So that I can resolve incidents without data ambiguity.

**Acceptance Criteria:**

**Given** callback/order discrepancies occur
**When** I inspect investigation views
**Then** I can trace callback logs, reconciliation attempts, and current order/payment states
**And** investigation actions are permission-checked and auditable.

### Story 8.2: Audit Trail for Critical Admin Actions

As a governance stakeholder,
I want complete audit visibility for critical changes,
So that operational accountability is preserved.

**Acceptance Criteria:**

**Given** an admin performs a critical action
**When** the action is committed
**Then** audit records capture actor, timestamp, entity, change summary, and request correlation metadata
**And** authorized reviewers can query logs without exposing restricted payload fields.

### Story 8.3: RBAC Boundary Enforcement at API Surface

As a security owner,
I want all privileged APIs to enforce RBAC consistently,
So that unauthorized access is blocked across admin and support surfaces.

**Acceptance Criteria:**

**Given** a protected API endpoint is invoked
**When** caller role lacks required permission
**Then** access is denied with standardized error response and no sensitive data leakage
**And** authorized roles can execute allowed operations normally.

### Story 8.4: API Contract Consistency and Version Safety

As a frontend and integration consumer,
I want stable API contracts,
So that client behavior remains predictable across releases.

**Acceptance Criteria:**

**Given** API endpoints for customer/admin flows
**When** responses are returned for success and error cases
**Then** payloads follow the `success/data/error` contract with version-safe schema evolution
**And** compatibility checks exist for planned MVP and post-MVP changes.

## Epic 9: Transactional Push Notification (Firebase MVP)

Deliver Firebase-powered transactional push notifications for critical order/payment events with resilient token management and operational safety controls.

### Story 9.1: Device Token Registry and Schema

As an authenticated customer,
I want my device push token registered and revocable,
So that the system can target my active devices reliably.

**Acceptance Criteria:**

**Given** I am an authenticated user on a supported client
**When** I register a device token
**Then** the system stores or updates token metadata idempotently per user/device
**And** revocation removes or deactivates only the targeted token without affecting others.

### Story 9.2: Transactional Firebase Push Dispatch

As the platform,
I want to dispatch transactional push notifications for order/payment events,
So that customers receive timely, device-level updates.

**Acceptance Criteria:**

**Given** a supported transactional event occurs
**When** dispatch is triggered
**Then** Firebase FCM is called for all active tokens of the target user
**And** duplicate event delivery is prevented by idempotency controls.

### Story 9.3: Push Reliability, Logs, and QA Gate

As an operations and QA stakeholder,
I want push delivery attempts fully logged and validated,
So that release risk is controlled and failures are diagnosable.

**Acceptance Criteria:**

**Given** push delivery attempts are processed
**When** success, partial failure, or provider errors occur
**Then** attempt outcomes are persisted with actionable diagnostics
**And** release gates include automated tests and staging smoke validation for multi-device and replay scenarios.
