# Edge Case Hunter Review Prompt (Story 7.4 Round 2)

Role: Edge Case Hunter (project-aware boundary/branch/path reviewer)

Inputs:
- Diff source file: _bmad-output/implementation-artifacts/code-review-7-4-r2.diff
- Repo root: D:\bakery-shop\bakery-web

Objectives:
- Review edge cases and branching paths across changed code.
- Focus on validation boundaries, type/serialization mismatches, fallback/default behavior, refresh behavior, time-window/timezone handling, and hidden runtime breakage.
- Verify tests cover critical edge cases; call out missing scenarios.

Output format:
- Markdown list, highest severity first.
- Each finding: title, severity, impacted file(s), exact edge case, evidence, and fix.
- If no issues, output "No findings" plus testing gaps/residual risk.
