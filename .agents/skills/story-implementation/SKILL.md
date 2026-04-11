---
name: story-implementation
description: "Implement software stories end-to-end in this repository with a consistent execution workflow: gather context from story artifacts, map acceptance criteria to code changes, implement incrementally, run required validation gates, and report delivery status. Use when the user asks to implement a story, develop the next sprint item, complete a feature ticket, or close a bugfix story with code and tests."
---

# Story Implementation

## Overview
Execute story work with a deterministic path from requirements to verified code changes. Prefer direct implementation over planning-only responses unless the user explicitly requests planning.

## Execution Workflow
1. Load context.
- Read the story artifact and related docs in `docs/`, `_bmad-output/`, or user-provided paths.
- Read `AGENTS.md` and repository conventions before editing.
- Identify explicit acceptance criteria, constraints, and out-of-scope items.

2. Map changes.
- Map each acceptance criterion to target files and tests.
- Identify backend/frontend contract impact early.
- Note data-model impact (`prisma/schema.prisma`) and required migration.

3. Implement in small slices.
- Edit minimal files needed to satisfy criteria.
- Preserve existing architecture (`app/`, `services/`, `lib/`, `hooks/`, `components/`).
- Keep naming conventions (`use-*.ts`, `*.service.ts`, route handlers in `app/api/**/route.ts`).

4. Validate.
- Run required gates in order: `npm run lint` -> `npm test` -> `npm run build`.
- If contracts changed, update `types/api.types.ts` and affected consumers.
- If schema changed, include migration under `prisma/migrations/`.

5. Report delivery.
- Summarize implemented behavior, changed files, and validation results.
- Call out unresolved risks, follow-ups, or deferred items explicitly.

## Decision Rules
- Prefer implementation-first behavior; avoid stopping at speculative design.
- Keep diffs focused to the active story.
- Do not revert unrelated user changes.
- If blocked by missing requirements or secrets, ask one concise question with the exact blocker.

## Use Reference Checklist
Use [references/story-delivery-checklist.md](references/story-delivery-checklist.md) before final response to ensure no acceptance or quality gate is missed.
