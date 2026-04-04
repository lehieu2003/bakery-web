# Project Overview

## Summary

`bakery-web` is a Next.js App Router e-commerce application for a bakery business, with public storefront pages, authenticated customer flows, and an admin back office.

## Repository Classification

- Type: Monolith web application
- Project type id: `web`
- Primary language: TypeScript
- Runtime: Node.js (Next.js server + browser clients)

## Core Technology Stack

| Category | Technology | Version | Evidence |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | `package.json` |
| UI | React / React DOM | 19.2.3 | `package.json` |
| Language | TypeScript | ^5 | `package.json`, `tsconfig.json` |
| ORM | Prisma | client ^6.4.0 / CLI ^6.19.2 | `package.json`, `prisma/schema.prisma` |
| Database | PostgreSQL | env-configured | `.env.example`, `schema.prisma` |
| Styling | Tailwind CSS | ^4 | `package.json`, `styles/globals.css` |
| State/Data | TanStack React Query | ^5.90.21 | `package.json`, `providers/query-provider.tsx` |
| Forms/Validation | React Hook Form + Zod | ^7.54.1 / ^3.24.1 | `package.json` |

## High-Level Functional Areas

- Public storefront pages (`app/(web)`)
- Admin dashboard and management pages (`app/admin`)
- HTTP API routes (`app/api`)
- Authentication/session handling (`lib/session.ts`, auth routes)
- Product/catalog/content/order/payment/notification domain data in Prisma schema

## Generated Documentation

- `architecture.md`
- `source-tree-analysis.md`
- `component-inventory.md`
- `development-guide.md`
- `deployment-guide.md`
- `contribution-guide.md`
- `api-contracts.md`
- `data-models.md`
- `index.md`
