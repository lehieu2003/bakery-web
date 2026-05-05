# Sprint Change Proposal

Date: 2026-04-19  
Project: bakery-web  
Prepared by: Scrum Master (Correct Course workflow)

## 1. Issue Summary

### Triggering Context
- Sprint tracking is fully completed through Epic 8 (`all stories done`, `all retrospectives done`).
- Current execution risk is now post-sprint continuity:
  - No next epic/stories planned in active sprint tracking.
  - Known technical blocker remains from completed epics: `vitest` worker startup issue (`ERR_REQUIRE_ASYNC_MODULE`) causing partial `npm test` failure.

### Problem Statement
The team has delivered all planned epics but lacks a defined next sprint scope, while a known quality-pipeline blocker remains unresolved. Without course correction, delivery can stall or continue with reduced verification confidence.

### Evidence
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: all Epic 1-8 stories marked done; retrospectives done.
- `_bmad-output/implementation-artifacts/epic-8-retro-2026-04-19.md`: explicitly carries forward test-runner and process debts.
- Story 8.4 completion notes: `npm test` partial due to existing Vitest jsdom/css-color startup issue.

## 2. Impact Analysis

### Epic Impact
- Epic 8 is complete; no in-flight epic requires rollback.
- Next sprint requires new planned scope (Epic 9+) or a formal stabilization sprint before new business features.

### Story Impact
- No existing stories require re-open.
- New stories are needed for:
  - Test infrastructure reliability restoration.
  - Story/sprint status consistency automation.
  - API contract governance formalization.

### Artifact Conflict Impact
- PRD: no direct conflict with MVP goals; this is a sequencing and operational quality issue.
- Architecture: no structural conflict; issue sits in testing/process layer.
- UX: no immediate conflict.
- Sprint artifacts: need new planned items to avoid idle/undefined sprint state.

### Technical Impact
- CI confidence remains partial while Vitest bootstrap remains broken.
- Team velocity may degrade if this blocker is deferred while adding new feature scope.

## 3. Option Evaluation

### Option 1: Direct Adjustment (Recommended)
- Add a new stabilization-focused epic (Epic 9) and implement via normal story flow.
- Effort: Medium
- Risk: Low
- Status: Viable

### Option 2: Potential Rollback
- Roll back recently completed governance work to simplify environment.
- Effort: High
- Risk: High
- Status: Not viable

### Option 3: PRD MVP Review
- Redefine MVP scope because of current issue.
- Effort: Medium
- Risk: Medium
- Status: Not viable (MVP outcomes already met; issue is operational hardening, not product goal misfit)

### Selected Approach
**Option 1 - Direct Adjustment**

Rationale:
- Preserves completed value from Epic 1-8.
- Addresses the highest practical blocker with minimal disruption.
- Enables next feature cycle with full test confidence.

## 4. Detailed Change Proposals (Batch)

### 4.1 Epics Update Proposal

Artifact: `_bmad-output/planning-artifacts/epics.md`

Proposed addition:
- **Epic 9: Delivery Stability & Governance Hardening**
  - Story 9.1: Fix Vitest worker bootstrap and restore full `npm test` reliability.
  - Story 9.2: Automate story-file vs sprint-status consistency checks.
  - Story 9.3: Codify API contract governance checklist and compatibility guard policy.

Rationale:
- Directly closes unresolved risks identified in Epic 7/8 retrospectives.

### 4.2 Sprint Tracking Update Proposal

Artifact: `_bmad-output/implementation-artifacts/sprint-status.yaml`

Proposed change:
- Add `epic-9: backlog`
- Add story keys for 9.1/9.2/9.3 as `backlog`
- Add `epic-9-retrospective: optional`

Rationale:
- Provides an actionable next sprint backlog and preserves workflow continuity.

### 4.3 PRD Adjustment Proposal (Optional Clarification)

Artifact: `_bmad-output/planning-artifacts/prd.md`

Proposed clarification:
- Add a short “Post-MVP Operational Hardening” note emphasizing test pipeline reliability as a release gate.

Rationale:
- Aligns operational quality constraints with ongoing delivery practice without changing business scope.

### 4.4 Architecture Clarification Proposal (Optional)

Artifact: `_bmad-output/planning-artifacts/architecture.md`

Proposed clarification:
- Add explicit testing reliability gate in Implementation Readiness:
  - Full regression command health required (`lint`, `test`, `build`) before story close.

Rationale:
- Converts observed practice into a formal architecture governance rule.

## 5. Recommended Execution Plan

1. Run `bmad-create-epics-and-stories` (or manual edit) to add Epic 9 and stories 9.1-9.3.
2. Update `sprint-status.yaml` with Epic 9 backlog entries.
3. Run `create-story` for 9.1 first (Vitest reliability).
4. Execute `dev-story` -> `code-review` for 9.1 before starting 9.2/9.3.
5. Continue standard flow for remaining Epic 9 stories.

## 6. Handoff Plan

### Scope Classification
**Moderate** (backlog and planning reorganization required; no rollback)

### Owners
- Product Owner / Scrum Master:
  - Add Epic 9 and sequence stories.
  - Update sprint tracking.
- Developer:
  - Implement Story 9.1 first.
- QA:
  - Validate full `npm test` recovery and guard against regression.
- Architect/PM (advisory):
  - Review governance checklist additions for architecture/PRD consistency.

### Success Criteria
- Epic 9 planned and tracked in sprint-status.
- Story 9.1 completed with full `npm test` passing (including vitest).
- New process guardrails for status sync and contract governance defined and adopted.

## 7. Checklist Status Snapshot

- 1. Understand trigger/context: **[x] Done**
- 2. Epic impact assessment: **[x] Done**
- 3. Artifact conflict/impact analysis: **[x] Done**
- 4. Path forward evaluation: **[x] Done**
- 5. Sprint change proposal components: **[x] Done**
- 6. Final review/handoff prep: **[x] Done** (pending explicit user approval)

---

## Approval Request

Please approve one of the following:

1. **Approve as-is** (proceed with Epic 9 setup)
2. **Approve with edits** (specify modifications)
3. **Reject** (provide alternate direction)
