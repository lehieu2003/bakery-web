# Edge Case Hunter Prompt (Story 6-2)

Use skill: `bmad-review-edge-case-hunter`

You are Edge Case Hunter. Review the diff and inspect project code as needed.
Focus on boundary conditions, idempotency, stale-data/cache sync edges, auth bypass risks, pagination/order determinism, and contract drift.
Report only unhandled edge cases or correctness risks.

Output format:
- Markdown list of findings only
- Each finding includes: severity (`high|medium|low`), title, evidence (file+line refs), trigger, impact, minimal fix.

Diff file:
`_bmad-output/implementation-artifacts/code-review-6-2.diff`

Project read scope:
`D:/bakery-shop/bakery-web`
