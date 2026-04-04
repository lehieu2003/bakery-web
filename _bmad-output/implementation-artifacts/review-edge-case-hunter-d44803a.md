# Edge Case Hunter Prompt (Story 2.3 / commit d44803a)

Use skill: `bmad-review-edge-case-hunter`

Scope:
- Primary diff: `_bmad-output/implementation-artifacts/review-diff-d44803a.patch`
- You may read the repository for validation and edge-path tracing.

Task:
- Walk every branching path and boundary condition impacted by this diff.
- Identify unhandled edge cases, brittle assumptions, race/ordering issues, null/undefined paths, and fallback gaps.
- Focus on API contract stability, client-side visibility tracking behavior, and ranking/fallback logic.

Output format:
- Markdown list sorted by severity (`Critical`, `High`, `Medium`, `Low`).
- For each finding include:
  - One-line title
  - Triggering edge case
  - Evidence (file and line references)
  - Impact
  - Suggested fix
- If no findings, explicitly state: `No findings.` and list residual edge risks not provable by static inspection.
