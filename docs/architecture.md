# Architecture

## Architecture Style

- Monolithic web architecture with layered feature boundaries
- Next.js App Router for UI and backend route handlers in one repository

## Runtime Layers

1. Presentation Layer
- App Router pages (`app/(web)`, `app/admin`)
- Reusable UI primitives (`components/ui`) and feature components (`components/screens`, `components/admin`)

2. Client Domain Layer
- Hooks for data orchestration and cache invalidation (`hooks/**`)
- Services for API request workflows (`services/**`)

3. API Layer
- Route handlers in `app/api/**/route.ts`
- Consistent JSON contract shape (`success`, `data`, `error`)

4. Domain/Infrastructure Layer
- Utility modules in `lib/**` (auth, rate limiting, slugging, email, payment)
- Prisma client singleton (`lib/prisma.ts`)
- PostgreSQL persistence via Prisma schema and migrations

## Authentication and Authorization

- Session token lifecycle managed by `lib/session.ts`
- Cookie session + Bearer token fallback for non-browser clients
- Route-level role enforcement with `requireAuth` / `requireAdmin`

## Data Flow (Typical Admin CRUD)

1. Admin page component triggers hook (`hooks/admin/use-*.ts`)
2. Hook calls service (`services/admin/*.service.ts`)
3. Service calls HTTP client (`lib/api/client.ts`)
4. API route validates request and checks authorization
5. API route uses Prisma to query/mutate database
6. Response returned in standard JSON shape
7. Hook invalidates React Query caches on success

## Cross-Cutting Concerns

- Input validation in route handlers (required fields, normalization)
- Error handling with HTTP status mapping and typed client exceptions
- Toast feedback via client HTTP wrapper (Sonner)
- Styling and tokens centralized in `styles/globals.css`
