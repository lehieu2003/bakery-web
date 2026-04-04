# Source Tree Analysis

## Root Structure

```text
bakery-web/
├── app/                 # Next.js App Router pages, layouts, and API routes
│   ├── (web)/           # Public web storefront routes
│   ├── admin/           # Admin UI routes
│   └── api/             # Route handlers (REST-style endpoints)
├── components/          # UI components by domain and reuse level
│   ├── ui/              # shadcn/radix-style primitive components
│   ├── ui-custom/       # Custom reusable widgets
│   ├── web/             # Web shell widgets (navbar/footer/etc)
│   ├── admin/           # Admin-specific components
│   └── screens/         # Page/screen-level presentation components
├── hooks/               # React Query and feature hooks
├── lib/                 # Core server/client shared utilities
│   ├── api/             # HTTP client and endpoint constants
│   └── payment/         # Payment provider integration helpers
├── services/            # Client service layer per feature
│   └── admin/           # Admin service layer
├── providers/           # App-level React providers
├── prisma/              # Schema, migrations, and seed
├── styles/              # Global stylesheet and design tokens
├── types/               # Shared TS types and API contracts
├── public/              # Static assets
└── docs/                # Generated project documentation
```

## Key Entry Points

- App shell: `app/layout.tsx`
- Public home route: `app/(web)/page.tsx`
- Admin root route: `app/admin/page.tsx`
- API root namespace: `app/api/**/route.ts`
- Database schema: `prisma/schema.prisma`

## Organization Conventions

- Route-based organization in `app/` (App Router)
- Feature hooks in `hooks/` and `hooks/admin/`
- Client services in `services/` and `services/admin/`
- Shared utilities in `lib/` with domain-focused files (`session.ts`, `prisma.ts`, `rate-limit.ts`)
- Typed API contracts in `types/api.types.ts`

## Integration Points

- UI components and hooks call `services/*`
- `services/*` call `lib/api/client.ts` (fetch wrapper/interceptors)
- API route handlers call Prisma and auth/session utilities from `lib/`
- Prisma maps domain persistence to PostgreSQL
