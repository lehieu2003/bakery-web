# Repository Guidelines

## Project Structure & Module Organization
- App Router pages and route handlers live in `app/` (including `app/api/**/route.ts`).
- Reusable UI and feature components live in `components/` (`components/ui` uses mostly kebab-case files; feature screens/admin use PascalCase).
- Business logic is split across `services/` (feature services), `lib/` (shared utilities, Prisma singleton, auth/session helpers), and `hooks/` (`use-*.ts[x]`).
- Database schema and migrations are in `prisma/schema.prisma` and `prisma/migrations/`.
- Tests are under `tests/` with domain folders plus `tests/vitest/` for React/Vitest suites.

## Build, Test, and Development Commands
- `npm run dev`: start local Next.js dev server at `http://localhost:3000`.
- `npm run build`: generate Prisma client, then build production app.
- `npm run start`: run production build locally.
- `npm run lint`: run ESLint (Next.js core-web-vitals + TypeScript config).
- `npm test`: run all tests (`test:node` and `test:vitest`).
- `npm run test:node`: run `tsx --test tests/**/*.test.ts`.
- `npm run test:vitest`: run Vitest once; use `npm run test:vitest:watch` for watch mode.

## Coding Style & Naming Conventions
- TypeScript strict mode is enabled; prefer explicit, typed contracts.
- Use path alias `@/*` for internal imports.
- Follow existing naming patterns:
  - Hooks: `use-*.ts` / `use-*.tsx`
  - Services: `*.service.ts`
  - API handlers: `route.ts` per segment
- Keep formatting ESLint-clean before opening a PR.

## Testing Guidelines
- Current stack is mixed: Node test runner (`node:test` via `tsx`) and Vitest (`jsdom` + Testing Library for UI).
- Name tests as `*.test.ts` or `*.test.tsx`.
- For backend/API changes, add route-level tests; when consumer behavior changes, add service/hook/component tests.
- Run verification in this order before opening a PR: `npm run lint` -> `npm test` -> `npm run build`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history, e.g. `feat(story-6.2): harden category admin integrity`.
- Keep commits and PRs scoped to one feature/story.
- PRs should include: summary, risk/impact notes, verification steps (commands run), and linked story/issue.
- If API contracts change, update `types/api.types.ts` and all affected consumers in `services/`, `hooks/`, and `components/`; document frontend impact and include paired UI updates or a tracked follow-up item.

## Database Migration Rule
- Any change to `prisma/schema.prisma` must include a matching migration under `prisma/migrations/` in the same PR.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets.
- Configure `DATABASE_URL` and `DIRECT_URL` before running Prisma-related commands.

## Development Best Practices
- **Server-First:** Fetch data in Server Components whenever possible. Use `services/` directly in Server Components to avoid unnecessary internal fetch calls.
- **Form Handling:** Use Server Actions for data mutations; ensure all inputs are validated with Zod schemas.
- **Client Components:** Add `'use client'` only to components that require interactivity (hooks, event listeners).
- **Prisma Safety:** Always run `npx prisma generate` after schema changes to sync types. Never modify existing migrations in `prisma/migrations/`.
- **API Responses:** Standardize error responses using a consistent format (e.g., `{ success: false, message: string }`).

## Code Reusability & Inventory First
- **Avoid Duplication:** Before implementing any new logic or UI, you MUST scan the existing codebase:
  - Check `components/ui/` and `components/` for reusable components.
  - Check `lib/utils.ts` and `hooks/` for existing helper functions or state logic.
  - Check `services/` to see if the required business logic/Prisma query is already defined.
- **Refactor over Repeat:** If a similar functionality exists but doesn't quite fit, prefer refactoring the existing code to be more generic rather than creating a duplicate "v2".
- **Naming for Discoverability:** Name files and functions descriptively so they are easily found via search (e.g., `format-currency.ts` instead of `price-helper.ts`).
