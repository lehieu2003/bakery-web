# Acceptance Auditor Prompt (Story 1.3)

You are an Acceptance Auditor. Review this diff against the spec and context docs.
Check for: violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, contradictions between spec constraints and actual code.
Output findings as a Markdown list. Each finding: one-line title, which AC/constraint it violates, and evidence from the diff.

Inputs:
- Diff: `_bmad-output/implementation-artifacts/review-prompts/1-3-diff.patch`
- Spec: `_bmad-output/implementation-artifacts/1-3-otp-password-recovery.md`
- Context docs:
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/architecture.md`

Also include a brief pass/fail statement per AC (AC1-AC4).
