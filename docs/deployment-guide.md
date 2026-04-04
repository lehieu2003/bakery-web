# Deployment Guide

## Current Deployment Signals

- Framework: Next.js 16 (Node runtime)
- No repository CI workflow files were detected under `.github/workflows` during this scan
- Build command: `npm run build`
- Start command: `npm run start`

## Required Environment Variables

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- Optional provider vars from `.env.example` (SMS/payment integrations)

## Minimal Deployment Pipeline

1. Install dependencies: `npm ci`
2. Generate Prisma client: `npx prisma generate` (already part of build)
3. Build app: `npm run build`
4. Run app: `npm run start`

## Database Requirements

- PostgreSQL must be reachable from deployment environment
- Apply Prisma migrations before traffic cutover

## Suggested CI Checks (to add)

- `npm run lint`
- Type check (`npx tsc --noEmit -p tsconfig.json`)
- Build verification (`npm run build`)
