# Edge Case Hunter Prompt (Story 1.3)

Use skill: `bmad-review-edge-case-hunter`

Rules:
- You get diff plus project read access.
- Focus on boundary conditions, failure paths, state consistency, idempotency, and missing tests.

Task:
1. Read patch file: `_bmad-output/implementation-artifacts/review-prompts/1-3-diff.patch`
2. Use read-only access to inspect relevant files around changed areas.
3. Produce findings as markdown bullets.
4. For each finding include:
   - Severity: High | Medium | Low
   - Edge case and trigger condition
   - Evidence (file/line or behavior)

Output only findings and a short residual-risk note.
