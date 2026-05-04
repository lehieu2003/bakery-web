# Sprint Change Proposal

Date: 2026-05-04  
Project: bakery-web  
Prepared by: Scrum Master (Correct Course workflow)

## 1. Issue Summary

### Triggering Context
- Sprint tracking is fully completed through Epic 8 (`all stories done`, `all retrospectives done`).
- A new business/operational requirement was identified after sprint completion: **MVP transactional push notification** for order/payment lifecycle events.
- Current notification implementation is in-app + email oriented; no Firebase FCM token/device push pipeline is implemented in active code paths.

### Problem Statement
The product currently lacks mobile/device push delivery for high-value transactional events. This creates a communication gap for order/payment updates and reduces timeliness compared to expected customer experience for transactional commerce notifications.

### Evidence
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: all current epics complete, no active backlog for this requirement.
- `package.json`: no Firebase Admin SDK dependency currently present.
- Existing notification/event handling is present (dispatcher + payment callback integration), but no FCM device-token channel.

## 2. Impact Analysis

### Epic Impact
- Existing Epics 1-8 do not need rollback.
- Current requirement maps to expansion/hardening of **Epic 5 (Notifications)** and touches **Epic 3 (Order/Payment events)** integration points.
- Recommend creating a new post-completion implementation tranche (Epic 9 or equivalent sprint slice) for controlled delivery.

### Story Impact
New stories required:
- Story A: Device Token Registry + Schema
- Story B: Transactional Push Service + Event Wiring
- Story C: Reliability, Logs, QA Gate

No existing completed story must be reopened if integration is additive and behind feature flag.

### Artifact Conflict Impact
- **PRD**: FR25 already covers notification delivery; this is a channel-specific implementation gap, not a requirement contradiction.
- **Architecture**: aligned with existing modular monolith and event-dispatch patterns; requires explicit external channel adapter (Firebase).
- **UX**: minimal/none for MVP transactional channel (server-side capability first).

### Technical Impact
- Schema additions required (`DeviceToken`, `PushNotificationLog`) + migration.
- External dependency and secure credential handling required (Firebase service account env).
- Payment callback and order event paths need additive push dispatch hooks.
- Test scope increases: API route tests, dispatcher/service tests, partial-failure and idempotency checks.

## 3. Option Evaluation

### Option 1: Direct Adjustment in New Sprint Slice (Recommended)
- Add dedicated stories A/B/C and implement incrementally behind feature flag (`PUSH_TX_ENABLED`).
- Effort: Medium
- Risk: Medium
- Status: Viable

### Option 2: Retrofit Inside Existing Completed Stories
- Reopen previously completed stories and inject changes retroactively.
- Effort: Medium-High
- Risk: High (traceability and regression risk)
- Status: Not recommended

### Option 3: Defer to Post-MVP Growth Batch
- No immediate implementation; continue in-app/email only.
- Effort: Low now, High later
- Risk: Medium (customer communication gap persists)
- Status: Not recommended

### Selected Approach
**Option 1 - Direct Adjustment in new sprint slice**

Rationale:
- Preserves completed scope integrity.
- Delivers customer-visible value with bounded risk.
- Fits existing architecture with minimal disruption.

## 4. Detailed Change Proposals (Batch)

### 4.1 Epics/Stories Proposal

Artifact: `_bmad-output/planning-artifacts/epics.md`

Proposed addition (new sprint tranche):
- **Epic 9: Transactional Push Notification (Firebase MVP)**
  - **9.1** Device token registry + persistence + API contract
  - **9.2** FCM dispatch service + transactional event integration
  - **9.3** Reliability hardening (idempotency/logging/retry policy) + QA automation

Rationale:
- Keeps change isolated, traceable, and executable in sequence.

### 4.2 Sprint Tracking Proposal

Artifact: `_bmad-output/implementation-artifacts/sprint-status.yaml`

Proposed entries:
- `epic-9: backlog`
- `9-1-device-token-registry-and-schema: backlog`
- `9-2-transactional-firebase-push-dispatch: backlog`
- `9-3-push-reliability-logs-and-qa-gate: backlog`
- `epic-9-retrospective: optional`

Rationale:
- Restores active implementation flow after completed sprint.

### 4.3 PRD Clarification Proposal

Artifact: `_bmad-output/planning-artifacts/prd.md`

Section updates:
- FR25 implementation note: transactional push channel via Firebase for order/payment events.
- NFR integration note: include push channel failure handling and operational observability.

Rationale:
- Keeps PRD aligned with implementation intent without changing product vision.

### 4.4 Architecture Clarification Proposal

Artifact: `_bmad-output/planning-artifacts/architecture.md`

Proposed updates:
- Add Firebase push adapter in integration architecture.
- Define idempotency key format for push events (`eventType + entityId + userId`).
- Add push-channel failure classification (transient vs permanent token failures).

Rationale:
- Prevents divergence during implementation and review.

## 5. Implementation Handoff

### Scope Classification
**Moderate** (new backlog organization + additive integration work across schema, API, dispatcher, tests)

### Owners
- Product Owner / Scrum Master:
  - Add Epic 9 + stories 9.1-9.3 in planning and sprint tracking.
- Developer:
  - Implement stories in order A -> B -> C behind feature flag.
- QA:
  - Validate multi-device delivery, partial failure handling, duplicate-event idempotency.
- Architect (advisory):
  - Approve reliability and external integration constraints.

### Success Criteria
- Epic/story artifacts added and tracked.
- Transactional push path implemented behind flag.
- No regression to existing order/payment callback flow.
- Route-level + service-level tests added and passing.

## 6. Checklist Status Snapshot

- 1. Understand trigger/context: **[x] Done**
- 2. Epic impact assessment: **[x] Done**
- 3. Artifact conflict/impact analysis: **[x] Done**
- 4. Path forward evaluation: **[x] Done**
- 5. Sprint change proposal components: **[x] Done**
- 6. Final review/handoff prep: **[x] Done** (pending explicit approval)

---

## Approval Request

Please choose one:

1. **Approve as-is** (proceed to Sprint Planning)
2. **Approve with edits** (specify changes)
3. **Reject** (provide alternate direction)
