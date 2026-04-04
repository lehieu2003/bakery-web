# Blind Hunter Prompt (Story 2.3 / commit d44803a)

Use skill: `bmad-review-adversarial-general`

Scope:
- Review ONLY the diff in this file:
- `_bmad-output/implementation-artifacts/review-diff-d44803a.patch`

Constraints:
- You receive NO project context, NO spec, NO repository browsing.
- Operate purely as a blind adversarial reviewer.

Task:
- Find concrete defects, regressions, risky assumptions, unsafe behavior, and contract violations visible from diff alone.
- Prioritize correctness and production risk over style.

Output format:
- Markdown list of findings sorted by severity (`Critical`, `High`, `Medium`, `Low`).
- For each finding include:
  - One-line title
  - Severity
  - Evidence (file/line snippets from diff)
  - Why it matters
  - Minimal fix direction
- If no findings, explicitly state: `No findings.` and list residual risks.
