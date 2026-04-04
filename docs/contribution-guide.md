# Contribution Guide

## Branch and PR Practice

- Use short-lived feature branches
- Open PRs with scope, risk, and verification notes
- Keep changes focused by feature/module

## Coding Conventions

- TypeScript strict mode is enabled
- Prefer existing path alias `@/*`
- Follow existing file naming pattern per folder:
  - `components/ui`: mostly kebab-case
  - feature/admin/screen components: PascalCase
  - hooks: `use-*.ts`
  - services: `*.service.ts`

## API Conventions

- Keep route handlers in `app/api/**/route.ts`
- Return consistent JSON contract (`success`, `data`, `error`)
- Enforce auth/role checks for restricted routes

## Data Access

- Use shared Prisma singleton in `lib/prisma.ts`
- Keep schema changes in `prisma/schema.prisma` with migration files committed

## Quality Gates

Run before merging:

```bash
npm run lint
npm run build
```

## API/UI Parity Policy (Required)

- Any backend contract change must include a frontend impact assessment in the PR/story notes.
- If frontend is affected, backend and frontend updates should ship together.
- If frontend is not implemented yet, create a tracked follow-up item (sprint/deferred work) in the same cycle; do not leave it implicit.
- Route-level tests are required for changed handlers; service/hook/component tests are required when consumer behavior changes.
