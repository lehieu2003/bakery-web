# API Contracts

## Notes

This document was generated in quick scan mode from route structure and representative handlers. It provides endpoint groups and route paths; method-level details may vary by handler.

## Contract Shape

Common response shape observed in route handlers:

```json
{ "success": true, "data": { }, "error": "" }
```

## Endpoint Groups

### Admin API (`/api/admin/*`)

- Banners: `/api/admin/banners`, `/api/admin/banners/reorder`, `/api/admin/banners/[id]`
- Blog categories/posts/tags: `/api/admin/blog/categories`, `/api/admin/blog/posts`, `/api/admin/blog/tags`, nested `[id]` and status routes
- Catalog: `/api/admin/categories`, `/api/admin/products`, `/api/admin/product-attributes` with nested `[id]` and reorder routes
- Operations: `/api/admin/customers`, `/api/admin/orders`, `/api/admin/menu`, `/api/admin/pages`, `/api/admin/settings`, `/api/admin/membership`, `/api/admin/notifications`, `/api/admin/dashboard`

### Auth API (`/api/auth/*`)

- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/register`
- `/api/auth/register/verify`
- `/api/auth/reset-password`
- `/api/auth/reset-password/verify`

### Public/Customer APIs

- Blog: `/api/blog/categories`, `/api/blog/posts`, `/api/blog/posts/[slug]`, `/api/blog/tags`
- Public catalog/content: `/api/public/banners`, `/api/public/categories`, `/api/public/menu`, `/api/public/pages`, `/api/public/products`, nested detail/filter/best-seller/related routes
- Orders and wishlist: `/api/orders`, `/api/wishlist`
- Notifications: `/api/notifications`, `/api/notifications/read-all`, `/api/notifications/[id]/read`
- Payments: `/api/payment/momo/callback`, `/api/payment/zalopay/callback`
- Uploads: `/api/upload`, `/api/upload/delete`
- Chat: `/api/chat`

## Security and Access Patterns

- Admin routes typically enforce `requireAdmin()`
- Session/cookie auth with optional bearer token support
- 401/403/500 mapping patterns are implemented in route handlers and mirrored in client error handling
