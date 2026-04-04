# Blind Hunter Prompt (Story 1.3)

Use skill: `bmad-review-adversarial-general`

Rules:
- You get diff only. No project context, no spec, no codebase browsing.
- Focus on vulnerabilities, logic errors, regressions, unsafe assumptions, contract breaks.

Task:
1. Read patch file: `_bmad-output/implementation-artifacts/review-prompts/1-3-diff.patch`
2. Produce findings as markdown bullets.
3. For each finding include:
   - Severity: High | Medium | Low
   - File + line evidence from diff
   - One-line impact statement

Output only findings and a short residual-risk note.
