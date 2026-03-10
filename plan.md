# Plan: Schema V2 Migration — Bakery Shop

## TL;DR

Upgrade Prisma schema from 8 models to 15+ models, adding Category tree, ProductImage, ProductVariant, server-side Cart, Address, Review, Wishlist, and Coupon. This is a **large-scale migration** touching ~40+ files across API routes, services, hooks, components, and types. Recommend a **phased approach** to avoid breaking the running app.

---

## Assessment of Proposed Schema

### ✅ Good additions

1. **Category tree** (`parentId` self-relation) — enables mega menu, essential for bakery with nested categories
2. **ProductImage table** — replaces the barely-used `images: String[]` + `imageUrl` pattern with proper relational images + `isPrimary` flag
3. **ProductVariant** — fills a real gap: admin form already has size/flavor UI but nothing persists
4. **Server-side Cart** — current client-side Context cart is lost on refresh. Server Cart enables cross-device persistence
5. **Address model** — structured addresses (province/district/ward/street) replaces the unused `customerAddress: String?`
6. **Review + Wishlist** — standard ecommerce features, ProductDetailScreen already shows hardcoded reviews
7. **Coupon** — extends beyond membership discounts, enables marketing campaigns

### ⚠️ Issues to fix in proposed schema

1. **Missing back-relations**: `Cart` needs `user User?` relation. `Product` needs `cartItems CartItem[]` back-relation. `ProductVariant` needs `cartItems CartItem[]` and `orderItems OrderItem[]` back-relations.
2. **Removed indexes that may hurt performance**:
   - `Session`: removed `@@index([token])` — token lookups happen on every authenticated request (critical path)
   - `Session`: removed `@@index([expiresAt])` — needed for session cleanup jobs
   - `Banner`: removed `@@index([isActive, displayOrder])` and `@@index([placement])` — used in public banner queries
   - `Setting`: removed `@@index([key])` — key lookups are the primary access pattern
   - `Product`: removed `@@index([isActive, isFeatured])` — used for homepage featured product queries
   - `OtpVerification`: removed `@@index([createdAt])` — useful for cleanup of expired OTPs
3. **CartItem missing `@@unique([cartId, productId, variantId])`** — prevents duplicate items in same cart
4. **Cart.userId** should have `@unique` if each user has one cart, or at least `@@index([userId])`
5. **Review** missing `@@unique([userId, productId])` if you want one review per user per product

### 💥 Breaking changes (high impact)

| Change                                        | Files impacted                                                                                     | Severity             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| `Product.imageUrl` removed                    | HomeScreen, ProductDetailScreen, CartScreen, CartStore, admin ProductForm, order APIs (~15 files)  | **HIGH**             |
| `Product.images: String[]` → `ProductImage[]` | Admin ProductForm, product APIs, types (~8 files)                                                  | **HIGH**             |
| Category tree (parentId)                      | Public category API, admin category page, HomeScreen category filtering, CategoryScreen (~6 files) | **MEDIUM**           |
| Server-side Cart (new)                        | CartStore, CartScreen, CheckoutScreens, new API routes needed (~10 files)                          | **HIGH** (net new)   |
| OrderItem.variantId                           | Order creation API, order service, types (~4 files)                                                | **LOW**              |
| Address model (new)                           | CheckoutInfoScreen, new API routes needed (~4 files)                                               | **MEDIUM** (net new) |

---

## Phased Implementation Plan

### Phase 1: Schema Migration & Data Model (foundation — do first)

1. Update `prisma/schema.prisma` to new schema with fixes (add back-relations, restore critical indexes)
2. Update `types/api.types.ts` with new/modified types: `ProductImage`, `ProductVariant`, `Cart`, `CartItem`, `Address`, `Review`, `Wishlist`, `Coupon`, `DiscountType`. Update `Product` type (remove `imageUrl`/`images`, add `images: ProductImage[]`, `variants: ProductVariant[]`)
3. Generate and apply Prisma migration: `npx prisma migrate dev --name schema-v2`
4. Update `prisma/seed.ts` to seed new models (ProductImage rows instead of imageUrl, sample categories with parentId, etc.)

### Phase 2: Product Images Migration (high-impact, unblocks frontend)

_Depends on Phase 1_ 5. Update `app/api/admin/products/route.ts` (POST) — create product with nested `images: { create: [...] }` instead of `imageUrl`/`images[]` 6. Update `app/api/admin/products/[id]/route.ts` (PUT) — handle image CRUD (add/remove/set primary) 7. Update `app/api/public/products/route.ts` and `[id]/route.ts` — include `images` relation in queries, compute primary image URL 8. Update `components/admin/ProductForm.tsx` — multi-image upload UI with primary flag, remove single `imageUrl` logic 9. Update `components/image-upload.tsx` if needed for multi-image support 10. Update all frontend components using `product.imageUrl`: - `components/screens/HomeScreen.tsx` — use `product.images.find(i => i.isPrimary)?.url` - `components/screens/ProductDetailScreen.tsx` — render actual image gallery from `product.images` - `components/screens/CartScreen.tsx` — update cart item image source - `lib/cart-store.tsx` — update `CartItem.image` derivation 11. Update order API queries that select `product.imageUrl` → select `product.images` - `app/api/orders/route.ts` - `app/api/admin/orders/route.ts` - `app/api/admin/orders/[id]/route.ts`

### Phase 3: Category Tree (_parallel with Phase 2_)

12. Update `app/api/public/categories/route.ts` — recursive/nested category query with `children` relation
13. Update `app/api/admin/categories/route.ts` — support `parentId` in create, return tree structure
14. Update `app/api/admin/categories/[id]/route.ts` — handle parent changes, prevent circular refs
15. Update `app/admin/categories/page.tsx` — tree view UI for category management
16. Update `components/screens/HomeScreen.tsx` — mega menu / nested category display
17. Update `components/screens/CategoryScreen.tsx` — subcategory navigation

### Phase 4: Product Variants (_depends on Phase 1_)

18. Update admin product form (`ProductForm.tsx`) — variant management UI (add/edit/remove variants with name, SKU, price, stock)
19. Update product creation/update APIs to handle nested variant CRUD
20. Update `ProductDetailScreen.tsx` — variant selector (size/weight dropdown), price display changes per variant
21. Update `lib/cart-store.tsx` — `CartItem` includes `variantId`, `variantName`, variant price

### Phase 5: Server-side Cart (_depends on Phase 4_)

22. Create new API routes:
    - `app/api/cart/route.ts` — GET (get/create cart), POST (add item)
    - `app/api/cart/[itemId]/route.ts` — PATCH (update quantity), DELETE (remove item)
23. Create `services/cart.service.ts` and `hooks/use-cart.ts`
24. Refactor `lib/cart-store.tsx` to sync with server API (hybrid: optimistic UI + server persistence)
25. Update `CartScreen.tsx` to use server cart
26. Update checkout flow to read from server cart

### Phase 6: Address System (_parallel with Phase 5_)

27. Create API routes: `app/api/addresses/route.ts` (GET/POST), `app/api/addresses/[id]/route.ts` (PUT/DELETE)
28. Create `services/address.service.ts` and `hooks/use-addresses.ts`
29. Update `CheckoutInfoScreen.tsx` — address picker with add/select/edit, province/district/ward cascading selects
30. Update order creation API — resolve address from `addressId`

### Phase 7: Review + Wishlist (_parallel with Phase 5_)

31. Create API routes for reviews: `app/api/products/[id]/reviews/route.ts` (GET/POST)
32. Create API routes for wishlist: `app/api/wishlist/route.ts` (GET/POST/DELETE)
33. Create hooks: `use-reviews.ts`, `use-wishlist.ts`
34. Update `ProductDetailScreen.tsx` — real review list + submit form
35. Add wishlist toggle button to product cards and detail page

### Phase 8: Coupon System (_depends on Phase 1_)

36. Create API routes: `app/api/coupons/validate/route.ts` (POST — validate code, check min order, date range, usage)
37. Create admin routes: `app/api/admin/coupons/route.ts` (CRUD)
38. Create admin page: `app/admin/coupons/page.tsx`
39. Update checkout flow — coupon code input field, apply discount
40. Update order creation API — validate and apply coupon discount

---

## Relevant Files

### Must modify (existing)

- `prisma/schema.prisma` — full schema rewrite
- `prisma/seed.ts` — update seed data for new models
- `types/api.types.ts` — add/update all types
- `app/api/admin/products/route.ts` — product create with images/variants
- `app/api/admin/products/[id]/route.ts` — product update with images/variants
- `app/api/public/products/route.ts` — include images relation
- `app/api/public/products/[id]/route.ts` — include images, variants, reviews
- `app/api/public/categories/route.ts` — tree query
- `app/api/admin/categories/route.ts` — parentId support
- `app/api/admin/categories/[id]/route.ts` — tree management
- `app/api/orders/route.ts` — variantId in OrderItem, coupon support
- `app/api/admin/orders/route.ts` — include variant in order items
- `app/api/admin/orders/[id]/route.ts` — include variant in order detail
- `components/admin/ProductForm.tsx` — multi-image, variants, persist options
- `components/screens/HomeScreen.tsx` — imageUrl → images[0], category tree
- `components/screens/ProductDetailScreen.tsx` — image gallery, variants, reviews
- `components/screens/CartScreen.tsx` — variant display, server cart
- `components/screens/CheckoutInfoScreen.tsx` — address picker
- `components/screens/CheckoutPaymentScreen.tsx` — coupon code
- `components/screens/CategoryScreen.tsx` — subcategory navigation
- `lib/cart-store.tsx` — server cart sync, variant support
- `services/product.service.ts` — updated response types
- `hooks/use-products.ts` — updated response types
- `app/admin/categories/page.tsx` — tree view UI

### Must create (new)

- `app/api/cart/route.ts` — cart API
- `app/api/cart/[itemId]/route.ts` — cart item API
- `app/api/addresses/route.ts` — address CRUD
- `app/api/addresses/[id]/route.ts` — single address
- `app/api/products/[id]/reviews/route.ts` — product reviews
- `app/api/wishlist/route.ts` — wishlist
- `app/api/coupons/validate/route.ts` — coupon validation
- `app/api/admin/coupons/route.ts` — coupon admin CRUD
- `app/admin/coupons/page.tsx` — coupon admin page
- `services/cart.service.ts`
- `services/address.service.ts`
- `hooks/use-cart.ts`
- `hooks/use-addresses.ts`
- `hooks/use-reviews.ts`
- `hooks/use-wishlist.ts`

---

## Verification

1. Run `npx prisma validate` after schema changes
2. Run `npx prisma migrate dev` and verify migration applies cleanly
3. Run `npx prisma db seed` to verify seed data
4. Test admin product CRUD — create product with multiple images and variants
5. Test public product listing — verify images load correctly
6. Test category tree — create nested categories, verify mega menu
7. Test cart flow end-to-end — add to cart → checkout → place order with variant
8. Test address management — add/edit/delete addresses, use in checkout
9. Test review submission and display
10. Test coupon code application in checkout
11. Verify all existing admin pages still work (dashboard KPIs, customer list, order management)
12. Run `npx tsc --noEmit` to catch type errors

---

## Decisions

- **Phased migration** recommended over big-bang to keep the app functional between phases
- Phase 1 (schema) is prerequisite; Phases 2-4 can partially overlap; Phases 5-8 are independent
- Existing `imageUrl` removal is the highest-risk change — consider adding a computed `primaryImageUrl` getter during transition
- Server-side Cart should support guest carts (nullable userId) for guest checkout compatibility
- Keep membership discount logic alongside new Coupon system (they stack or pick higher)

## Further Considerations

1. **Data migration for existing products**: Existing products have `imageUrl` data. Need a migration script to copy `imageUrl` → `ProductImage` rows with `isPrimary: true`. Option A: SQL migration / Option B: seed script / **Recommended: Option A** (SQL in migration file)
2. **Cart: hybrid vs full server-side**: Option A: Full server-side (every action = API call) / Option B: Hybrid with optimistic UI + background sync / **Recommended: Option B** for better UX
3. **Address format**: The proposed schema uses free-text province/district/ward. Consider using standardized Vietnamese address codes (GHN/GHTK APIs) for delivery integration later. **Recommendation**: Keep free-text for now, add code fields later if needed
