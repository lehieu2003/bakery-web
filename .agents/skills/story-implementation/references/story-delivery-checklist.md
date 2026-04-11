# Story Delivery Checklist

Use this checklist after implementing a story and before final handoff.

## 1) Scope and Acceptance
- Confirm every acceptance criterion is mapped to code or an explicit follow-up.
- Confirm out-of-scope items were not implemented unintentionally.
- Confirm no unrelated refactors were mixed into the story diff.

## 2) Code Changes
- Confirm file placement follows project structure (`app/`, `services/`, `lib/`, `hooks/`, `components/`).
- Confirm naming conventions remain consistent (`use-*.ts[x]`, `*.service.ts`, `route.ts`).
- Confirm changed behavior has defensive error handling where appropriate.

## 3) Contract and Data Integrity
- If API request/response changed, update `types/api.types.ts` and all affected consumers.
- If route semantics changed, update route-level tests.
- If `prisma/schema.prisma` changed, add a migration in `prisma/migrations/`.

## 4) Verification Gates
Run in this exact order:
1. `npm run lint`
2. `npm test`
3. `npm run build`

If any gate fails, fix or document the blocker with concrete details.

## 5) Final Delivery Format
- List key behavior delivered (not just file names).
- List tests and commands executed with pass/fail outcomes.
- List known risks, assumptions, and follow-up tasks.
- Keep summary concise and directly tied to the story acceptance criteria.
