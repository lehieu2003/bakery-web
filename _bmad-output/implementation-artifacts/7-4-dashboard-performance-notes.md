# Story 7.4 Performance Notes (NFR2)

Date: 2026-04-14  
Scope: `/api/admin/dashboard` read path (local benchmark with real DB queries, mocked admin auth only)

## Method

- Runner: `npx tsx` script calling `handleAdminDashboardGetRequest` directly.
- Data source: current configured PostgreSQL database (`DATABASE_URL`).
- Measurement:
  - 30 runs for `windowDays=7`
  - 30 runs for `windowDays=30`
  - measured end-to-end handler duration at caller side (`Date.now()` around handler call).
- Query model used in benchmark matches current route logic:
  - business timezone day buckets (`Asia/Ho_Chi_Minh`)
  - DB-level grouped aggregation for window status/day
  - recent orders + counts

## Results

- Sample order count in current business day during run: `0`
- `windowDays=7`
  - `p50`: `719ms`
  - `p95`: `837ms`
  - `avg`: `745.03ms`
  - `min/max`: `637ms / 1501ms`
- `windowDays=30`
  - `p50`: `704ms`
  - `p95`: `803ms`
  - `avg`: `708.23ms`
  - `min/max`: `639ms / 852ms`

## NFR2 Evaluation

- Target from PRD NFR2 for read endpoints: `p95 <= 400ms`.
- Current measured p95 is **above target** in this environment.

## Notes

- This run validates a practical baseline and confirms behavior after CR optimizations (DB-level aggregation + removed unused top-products query).
- Current latency profile suggests external/environmental overhead (network + remote DB) dominates local execution target.
- Recommendation for follow-up hardening:
  - add DB indexes tuned for dashboard filters/grouping,
  - evaluate caching/materialized rollups for dashboard windows,
  - measure again in deployment-like network topology.
