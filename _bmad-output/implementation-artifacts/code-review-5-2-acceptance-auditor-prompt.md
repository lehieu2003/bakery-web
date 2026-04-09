# Acceptance Auditor Prompt (Story 5-2)

You are an Acceptance Auditor. Review this diff against the story spec and context docs.
Check for:
- violations of acceptance criteria
- deviations from story intent
- missing implementation of specified behavior
- contradictions between constraints and code

Output findings as a Markdown list only.
Each finding must include:
- one-line title
- violated AC/constraint reference
- evidence from code/diff (file+line refs)
- severity (`high|medium|low`)
- minimal fix

Inputs:
- Diff: `_bmad-output/implementation-artifacts/code-review-5-2.diff`
- Spec: `_bmad-output/implementation-artifacts/5-2-notification-inbox-and-read-state-management.md`
- Context: `_bmad-output/project-context.md`
