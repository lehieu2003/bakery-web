# Acceptance Auditor Review Prompt (Story 7.4)

You are an Acceptance Auditor. Review the diff against the story spec and constraints.
Check for:
- violations of acceptance criteria
- deviations from spec intent
- missing implementation of specified behavior
- contradictions between spec constraints and actual code

Output findings as a Markdown list.
Each finding must include:
- one-line title
- which AC/constraint it violates
- evidence from the diff

Spec file:
- _bmad-output/implementation-artifacts/7-4-dashboard-metrics-and-kpi-views.md

Diff source file:
- _bmad-output/implementation-artifacts/code-review-7-4.diff
