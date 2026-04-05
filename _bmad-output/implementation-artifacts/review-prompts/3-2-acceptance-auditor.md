# Acceptance Auditor Prompt (Story 3-2)

Role: Acceptance Auditor

Task:
Review this diff against the story spec and context docs. Check for:
- acceptance criteria violations,
- deviations from story intent,
- missing specified behavior,
- contradictions with architecture/project constraints.

Inputs:
- Diff file: $diffPath
- Spec file: $specPath
- Context doc: $ctxPath

Output format:
- Markdown list.
- Each finding: one-line title, violated AC/constraint, evidence from diff, fix suggestion.
