# Story 8.3 RBAC Coverage Matrix

This matrix defines protected API boundaries, required policy, and expected denial behavior.

## Policy Legend

- `ADMIN_ONLY`: authenticated user with role `ADMIN` only
- `AUTHENTICATED_USER`: authenticated user with role `ADMIN` or `CUSTOMER`
- `RECONCILE_TOKEN`: valid operational token via `x-reconcile-token` header or `Authorization: Bearer <token>`

## Endpoint Matrix

| Endpoint Group | Policy | Unauthorized | Forbidden | Notes |
| --- | --- | --- | --- | --- |
| `app/api/admin/**` | `ADMIN_ONLY` | `401` | `403` | All privileged admin/surveillance mutations and reads |
| `app/api/upload/route.ts` | `AUTHENTICATED_USER` | `401` | N/A | Sensitive asset upload; deny response must not leak internals |
| `app/api/upload/delete/route.ts` | `AUTHENTICATED_USER` | `401` | N/A | Sensitive asset delete; deny response must not leak internals |
| `app/api/incentives/reconcile/route.ts` | `RECONCILE_TOKEN` | `401` | N/A | Operational reconciliation route; token mismatch treated as unauthorized |
| `app/api/orders/**` | `AUTHENTICATED_USER` + ownership checks | `401` | `403`/domain-safe deny | Customer-facing protected resources; no cross-user leakage |
| `app/api/orders/reorder/route.ts` | `AUTHENTICATED_USER` + ownership checks | `401` | `403`/domain-safe deny | Reorder only from owned historical orders |
| `app/api/wishlist/route.ts` | `AUTHENTICATED_USER` | `401` | N/A | User-scoped data only |
| `app/api/notifications/**` | `AUTHENTICATED_USER` | `401` | N/A | User-scoped read/update actions |
| `app/api/membership/benefits/route.ts` | `AUTHENTICATED_USER` | `401` | N/A | Membership benefits are user-context protected |

## Validation Checklist

- Admin routes must use centralized session/RBAC checks and deterministic `401/403` mapping.
- Protected non-admin routes must return `{ success: false, error: string }` on denial with no sensitive payload.
- Tests must cover representative denial and allow paths for each endpoint class.

