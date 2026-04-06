# Development Guide

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL (local or hosted)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure database URLs:
- `DATABASE_URL`
- `DIRECT_URL`
3. Configure app URL and optional SMS provider variables

## Install and Run

```bash
npm install
npm run dev
```

Default app URL: `http://localhost:3000`

## Build and Start

```bash
npm run build
npm run start
```

`build` runs Prisma client generation first.

## Linting

```bash
npm run lint
```

## Database Workflow

- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/*`
- Prisma client auto-generated on `postinstall`

Common commands:

```bash
npx prisma generate
npx prisma migrate status
```

## Code Organization Rules

- Routes and API handlers under `app/`
- Shared utilities under `lib/`
- API client and endpoint constants under `lib/api/`
- Feature services under `services/`
- Hooks under `hooks/`
- Shared types under `types/`

## Backend -> Frontend Sync Gate (Mandatory)

For every backend/API change, run this checklist in the same PR/story before marking review-ready:

1. Contract impact check:
- Confirm request/response fields, status codes, and error semantics changed or unchanged.
- Update `types/api.types.ts` and `lib/api/endpoints.ts` if needed.

2. Consumer discovery:
- Search all call sites in `services/`, `hooks/`, `components/`, `app/`.
- Verify each consumer still matches the contract.

3. UI parity decision:
- If no UI consumes the new/changed backend capability yet, create an explicit frontend follow-up action item in sprint/deferred work.
- If UI already consumes it, update UI in the same change-set.

4. Coverage gate:
- Add/adjust route-level tests for changed handlers.
- Add/adjust consumer-level tests (service/hook/component) where behavior changed.

5. Done criteria:
- Do not mark story `done` unless either:
  - frontend consumer is updated and validated, or
  - a tracked frontend follow-up item exists with owner and status.

## Testing Status

Current repository tests are implemented with Node.js built-in runner (`node:test`) and executed via `tsx --test`.

## Testing Direction (Next Sprints)

- Starting from upcoming sprints, prefer `Vitest` (or `Jest` when explicitly required) for all new test files.
- Keep existing `node:test` suites passing during migration; do not rewrite old tests unless the touched area requires it.
- For frontend component/hook testing, use `Vitest` + `jsdom` + React Testing Library.
- Add a `test` script in `package.json` once the first Vitest/Jest setup lands, then standardize CI on that command.
