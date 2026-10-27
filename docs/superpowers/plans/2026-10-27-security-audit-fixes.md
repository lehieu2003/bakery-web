# Security Audit Fixes (2026-10-27) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vá các lỗ hổng đã kiểm chứng trong audit 2026-10-27: 1 HIGH (Google mobile login chấp nhận token của app khác), 3 MEDIUM (xóa ảnh Cloudinary, lộ giá vốn, đơn treo giữ kho), các LOW và các needs_validation sửa rẻ.

**Architecture:** Tất cả sửa đổi nằm trong `bakery-web`. Route handler nào cần test thì tách thành `handle…Request(request, deps)` theo pattern có sẵn (`app/api/upload/delete/route.ts`). Rate-limit tái dùng `checkAuthRateLimit` / `enforceIpRateLimit` của `lib/rate-limit.ts`. Ẩn trường nội bộ của Product bằng `omit` của Prisma 6 (đã GA), khai báo một lần và dùng chung.

**Tech Stack:** Next.js 16 route handlers, Prisma 6, node:test (`tests/**/*.test.ts`) + vitest.

**Spec:** `/Users/lehieu/Projects/personal/bakery/bao-cao-audit-2026-10-27.md` — phần **A.2** (bảng 22 mục; cột "Task" trỏ về task trong plan này). Không làm theo các bản vá trong phần Phụ lục của báo cáo.

## Global Constraints

- Không thêm dependency mới.
- Test mới dùng node:test theo pattern `tests/auth/*.test.ts`, `tests/products/*.test.ts` (inject deps, không gọi DB/mạng thật).
- Sau mỗi task: `pnpm typecheck` sạch + suite liên quan pass. Cuối plan: `pnpm validate` xanh.
- Ngoài phạm vi: thanh toán (MoMo/VNPay — chủ dự án yêu cầu để sau, đang sandbox), rate-limit theo `x-forwarded-for` / bộ đếm in-memory, hạ tầng VPS (cả hai theo dõi ở `docs/known-issues.md`).
- Đổi `app/api/**` → kiểm consumer trong `../bakery-mobile/lib/src/features/**/data/` và ghi ảnh hưởng vào PR.

## Review Focus

- **Google mobile login gãy** nếu `aud` không khớp: app mobile gửi `idToken` có `aud` = `serverClientId` (`bakery-mobile/.../auth_view_model.dart:75`). Task 1 có bước xác nhận giá trị đó bằng `GOOGLE_CLIENT_ID` trên Vercel, hoặc khai báo thêm qua `GOOGLE_MOBILE_CLIENT_IDS`. Không hardcode client ID.
- tokeninfo trả `email_verified` dạng **chuỗi** `"true"`; userinfo v3 trả **boolean** `true`. Chuẩn hóa về boolean trước khi gọi `upsertGoogleUser`.
- `omit` làm thiếu field mà UI đang đọc → grep `costPrice` / `barcode` trong `components/`, `app/(shop)`, `hooks/`, `services/` và mobile trước khi bỏ; trang admin dùng route `/api/admin/**` nên không ảnh hưởng.
- Task 4 đụng nghiệp vụ đơn hàng → **dừng lại hỏi chủ dự án** trước khi code (xem Task 4).
- Thông báo lỗi coupon (Task 5) và đăng ký (Task 6) đổi chữ → kiểm tra UI web + mobile có so khớp chuỗi lỗi không.

---

### Task 1: Google mobile login — chỉ nhận idToken đúng audience

**Files:**
- Modify: `app/api/auth/google/mobile/route.ts`
- Modify: `lib/auth/google-oauth.ts`
- Modify: `.env.example` (thêm `GOOGLE_MOBILE_CLIENT_IDS=""`)
- Test: `tests/auth/google-mobile-route.test.ts` (mới), mở rộng `tests/auth/google-oauth.test.ts`

**Interfaces:**
- Produces: `handleGoogleMobileAuthRequest(request, deps)` với deps `{ fetchTokenInfo(idToken): Promise<Record<string,string> | null>, upsertGoogleUser, createSession, setSessionCookie }`; `getAllowedGoogleAudiences(): string[]` (từ `GOOGLE_CLIENT_ID` + `GOOGLE_MOBILE_CLIENT_IDS` tách dấu phẩy, bỏ rỗng).
- `upsertGoogleUser(info)` ném lỗi khi `info.email_verified !== true`.

- [x] **Step 1: Viết test thất bại** — `tests/auth/google-mobile-route.test.ts`: (a) body chỉ có `accessToken` → 400; (b) tokeninfo `aud` không nằm trong danh sách → 401, `upsertGoogleUser` không được gọi; (c) `email_verified: "false"` → 401; (d) token hợp lệ → 200 và `upsertGoogleUser` nhận `email_verified: true`; (e) lần thứ 11 trong 15 phút cùng IP → 429 kèm `Retry-After` (dùng `__resetIpRateLimitForTests()` giữa các test). Trong `google-oauth.test.ts`: `upsertGoogleUser` với `email_verified: false` hoặc thiếu → reject (inject prisma giả hoặc tách phần kiểm ra hàm thuần `assertGoogleEmailVerified`).
- [x] **Step 2: Chạy FAIL** — `pnpm exec tsx --test tests/auth/google-mobile-route.test.ts tests/auth/google-oauth.test.ts`. Expected: FAIL.
- [x] **Step 3: Implement** — trong route: gọi `checkAuthRateLimit(request, 'auth-login')` đầu tiên; bỏ nhánh `accessToken` (trả 400 `Thiếu idToken của Google`); sau tokeninfo kiểm `aud ∈ getAllowedGoogleAudiences()` (danh sách rỗng → 500 cấu hình, không cho qua) và `email_verified === 'true'`; truyền `email_verified: true` vào `upsertGoogleUser`. Trong `upsertGoogleUser`: kiểm `email_verified === true` trước bước tìm theo email. Web callback (`app/api/auth/google/callback/route.ts`) dùng userinfo trả boolean nên chạy được ngay.
- [x] **Step 4: Kiểm consumer mobile** — `bakery-mobile/lib/src/features/auth/data/datasources/auth_api_service.dart:32-38` gửi cả `idToken` và `accessToken`; server bỏ qua `accessToken` nên không cần sửa mobile. Ghi vào PR: chủ dự án xác nhận `GOOGLE_CLIENT_ID` trên Vercel = `serverClientId` của mobile, nếu không thì đặt `GOOGLE_MOBILE_CLIENT_IDS`.
- [x] **Step 5: PASS + typecheck**, rồi **Commit** — `fix(auth): verify google id token audience and email_verified on mobile login`

### Task 2: Chỉ admin được xóa ảnh Cloudinary

**Files:**
- Modify: `app/api/upload/delete/route.ts:17-18`
- Test: `tests/auth/upload-routes.test.ts` (mở rộng)

- [x] **Step 1: Test thất bại** — `handleUploadDeleteRequest` với `requireUploader` mặc định phải dùng policy `ADMIN_ONLY`: export `UPLOAD_DELETE_POLICY` và assert bằng `RBAC_POLICY_KEYS.ADMIN_ONLY`; thêm test qua `tests/auth/rbac-matrix.test.ts` nếu ma trận liệt kê route này.
- [x] **Step 2: Chạy FAIL**
- [x] **Step 3: Implement** — đổi `RBAC_POLICY_KEYS.AUTHENTICATED_USER` → `RBAC_POLICY_KEYS.ADMIN_ONLY`. Consumer duy nhất là `hooks/use-image-upload.ts:179` (trang admin); mobile không gọi route này.
- [x] **Step 4: PASS**, **Commit** — `fix(upload): restrict cloudinary delete to admins`

### Task 3: Ẩn giá vốn/mã vạch và sản phẩm đã ẩn khỏi API công khai

**Files:**
- Create: `lib/products/public-product-query.ts` — `PUBLIC_PRODUCT_OMIT`, `PUBLIC_PRODUCT_CARD_ARGS`, `WISHLIST_PRODUCT_INCLUDE` (route `related` đã dùng `select`, không cần sửa)
- Modify: `app/api/public/products/route.ts`, `app/api/public/products/[id]/route.ts`, `app/api/public/products/[id]/related/route.ts`, `app/api/public/products/best-sellers/route.ts`, `app/api/public/products/personalized/route.ts`, `app/api/wishlist/route.ts` (2 chỗ `product: { include … }`)
- Test: các file `tests/products/public-*-route.test.ts`, `best-sellers-route.test.ts`, `personalized-products-route.test.ts` (mở rộng), wishlist test (mới nếu chưa có)

- [x] **Step 1: Grep consumer** — `grep -rn "costPrice\|barcode" components app/\(shop\) hooks services types ../bakery-mobile/lib` (bỏ qua `app/admin`, `app/api/admin`). Kiểm ngày 2026-10-27: storefront và mobile không đọc; chỉ có type `types/api.types.ts:115-117` khai báo `costPrice`/`barcode` bắt buộc → tách type sản phẩm công khai (không có hai field này) khỏi type admin, cập nhật import nơi dùng.
- [x] **Step 2: Test thất bại** — với deps giả, assert tham số truyền vào prisma có `omit: PUBLIC_PRODUCT_OMIT` (hoặc response không chứa `costPrice`/`barcode`); route `[id]` truyền `isActive: true` trong `where`.
- [x] **Step 3: Chạy FAIL**
- [x] **Step 4: Implement** — thêm `omit: PUBLIC_PRODUCT_OMIT` cạnh `include` ở mọi truy vấn Product trên; route `[id]`: `where: { isActive: true, OR: [{ id: idOrSlug }, { slug: idOrSlug }] }`.
- [x] **Step 5: PASS + typecheck**, **Commit** — `fix(products): stop exposing cost price, barcode and inactive products publicly`

### Task 4: Tự hủy đơn chuyển khoản chưa thanh toán sau 24 giờ

**Quyết định (chủ dự án, 2026-10-27):** phương án (b). Không tự hủy COD (đơn COD hợp lệ có thể chờ tới lúc giao); không giới hạn số đơn theo SĐT.

Bối cảnh: `app/api/orders/route.ts:436` trừ kho ngay khi tạo đơn. Đơn `BANK_TRANSFER` không có bản ghi Payment, ở `PENDING` cho tới khi admin xác nhận đã nhận tiền. `lib/orders/stock.ts` đã có `cancelOrderAndRestoreStock(tx, orderId)` (đổi trạng thái có điều kiện → trả kho đúng một lần) và `lib/incentives/redemption-lifecycle.ts` có `applyCouponLifecycleForOrderStatus({ status: 'CANCELLED' })` — admin cancel (`app/api/admin/orders/[id]/route.ts:122-148`) dùng đúng cặp này. Phát hiện thêm: job `app/api/incentives/reconcile/route.ts` chưa được lên lịch ở đâu (không có trong `vercel.json`, workflow hay docs).

**Files:**
- Create: `lib/orders/expire-unpaid.ts`
- Create: `app/api/cron/expire-unpaid-orders/route.ts`
- Modify: `vercel.json` (thêm `crons`), `.env.example` (`CRON_SECRET=""`, `UNPAID_BANK_TRANSFER_TTL_HOURS="24"`)
- Test: `tests/orders/expire-unpaid.test.ts` (mới), `tests/orders/expire-unpaid-route.test.ts` (mới)

**Interfaces:**
- Produces: `expireUnpaidBankTransferOrders(args: { olderThanHours: number; batchSize: number; now?: () => Date }, deps?) => Promise<{ scanned: number; cancelled: number; threshold: Date }>`. Chọn đơn `status: 'PENDING'`, `paymentMethod: 'BANK_TRANSFER'`, `createdAt < now - olderThanHours`, sắp theo `createdAt asc`, `take: batchSize`. Mỗi đơn một transaction: `cancelOrderAndRestoreStock(tx, id)`; nếu trả `true` → `applyCouponLifecycleForOrderStatus({ orderId: id, status: 'CANCELLED', reason: 'BANK_TRANSFER_EXPIRED', tx })` + ghi audit log (pattern `writeOrderAuditLog…` nếu có, actor hệ thống).
- Produces: `handleExpireUnpaidOrdersRequest(request, deps)` — `requireRequestToken(request, CRON_SECRET, { headerName: 'x-cron-token', allowBearer: true })` (Vercel Cron gửi `Authorization: Bearer $CRON_SECRET`); thiếu `CRON_SECRET` → 503; trả `{ success: true, data: { scanned, cancelled, threshold } }`.

- [ ] **Step 1: Test thất bại (lib)** — với tx/prisma giả: (a) chỉ đơn PENDING + BANK_TRANSFER quá 24h được hủy; COD, MOMO, VNPAY, đơn CONFIRMED, đơn BANK_TRANSFER mới 23h không bị đụng; (b) `cancelOrderAndRestoreStock` trả `false` (admin vừa hủy) → không release coupon, không tính vào `cancelled`; (c) lỗi ở một đơn không chặn các đơn còn lại (log + tiếp tục); (d) tôn trọng `batchSize`.
- [ ] **Step 2: Test thất bại (route)** — không token → 401; sai token → 403; thiếu `CRON_SECRET` → 503; token đúng (header hoặc Bearer) → 200 và gọi lib với `olderThanHours` từ env (mặc định 24).
- [ ] **Step 3: Chạy FAIL** — `pnpm exec tsx --test tests/orders/expire-unpaid*.test.ts`.
- [ ] **Step 4: Implement** lib + route (export `GET` vì Vercel Cron gọi GET).
- [ ] **Step 5: Lên lịch** — `vercel.json`: `"crons": [{ "path": "/api/cron/expire-unpaid-orders", "schedule": "0 * * * *" }]`. Gói Hobby của Vercel chỉ cho cron chạy mỗi ngày một lần → nếu deploy báo lỗi, đổi thành `"0 0 * * *"` (đơn bị hủy chậm nhất ~48h) và ghi vào PR. Ghi trong PR: chủ dự án đặt `CRON_SECRET` trên Vercel. Nếu sau này tự host (xem `docs/known-issues.md`) thì chuyển sang crontab trên VPS gọi cùng route.
- [ ] **Step 6: Ghi chú job reconcile coupon chưa được lên lịch** vào PR và `docs/known-issues.md` (không sửa trong task này để giữ phạm vi).
- [ ] **Step 7: PASS + typecheck**, **Commit** — `feat(orders): auto-cancel unpaid bank transfer orders after 24h and restore stock`

### Task 5: Coupon — perUserLimit cho khách vãng lai, cộng trùng khi hủy, lộ mã qua preview

**Files:**
- Modify: `app/api/orders/route.ts:950-955`, `lib/incentives/redemption-lifecycle.ts:30-36,195-216`, `app/api/incentives/preview/route.ts:405-415,474`
- Test: `tests/orders/*` và test incentives liên quan (mở rộng)

- [ ] **Step 1: Test thất bại** — (a) khách vãng lai, cùng SĐT, coupon `perUserLimit: 1` đã dùng 1 lần → bị từ chối; (b) hai lần release chạy chồng (giả lập `updateMany` trả `count: 0` cho lần sau) → `usageLimit` chỉ +1; (c) preview mã TARGETED không dành cho người gọi → cùng thông báo + status như mã không tồn tại; (d) preview vượt rate-limit → 429.
- [ ] **Step 2: Chạy FAIL**
- [ ] **Step 3: Implement** — (a) khi không có `user.id`, đếm redemption COMMITTED/RESERVED theo `customerPhone` đã chuẩn hóa (thêm deps `countGuestCommittedIncentiveUsage(incentiveId, phone)`); (b) `updateMany` thêm `state: 'RESERVED'` vào `where`, lấy `count`; chỉ `increment` cho coupon của các bản ghi thực sự chuyển trạng thái (làm từng bản ghi: `updateMany({ where: { id, state: 'RESERVED' } })`, `count === 1` mới cộng); (c) gom các lý do NOT_ASSIGNED / chưa bắt đầu / đã hết hạn của mã không công khai về cùng thông báo `Mã giảm giá không hợp lệ`; thêm `enforceIpRateLimit(request, 'incentives-preview', { maxRequests: 20, windowMs: 10 * 60 * 1000 })`.
- [ ] **Step 4: PASS**, **Commit** — `fix(incentives): enforce guest per-user limits and close coupon oracles`

### Task 6: Auth/đơn hàng — email khách, độ dài mật khẩu, dò tài khoản

**Files:**
- Modify: `app/api/orders/route.ts` (~698), `lib/password.ts:39-50`, `app/api/auth/register/verify/route.ts:49`, `app/api/auth/reset-password/verify/route.ts:73`, `app/api/auth/register/route.ts:63-152`, `app/api/auth/register/verify/route.ts:68-76`
- Test: `tests/orders/*`, `tests/auth/reset-password-routes.test.ts`, `tests/auth/auth-endpoints.test.ts` (mở rộng)

- [ ] **Step 1: Test thất bại** — (a) `customerEmail: "a@x.com,b@y.com"` → 400; (b) reset mật khẩu 7 ký tự → 400; (c) đăng ký với email đã xác thực và email mới → cùng shape `data` (cùng key, cùng message); (d) register/verify với OTP sai cho email đã xác thực → cùng lỗi như email chưa có.
- [ ] **Step 2: Chạy FAIL**
- [ ] **Step 3: Implement** — (a) orders: nếu có `customerEmail` thì `validateEmail` (từ `lib/rate-limit.ts`) + chặn `,` `;`, dùng giá trị `normalized`; (b) `validatePassword` nâng tối thiểu lên 8, dùng ở cả register/verify và reset-password/verify (bỏ kiểm tay); (c) register trả cùng `{ message: 'Nếu email hợp lệ, OTP đã được gửi', email, expiresIn: 300 }` cho mọi nhánh (kiểm ngày 2026-10-27: mobile và `components/`/`hooks/`/`services/` không đọc `expiresIn`/`pending`; grep lại `app/` trước khi bỏ `pending`); (d) register/verify kiểm OTP trước, rồi mới kiểm `emailVerifiedAt`.
- [ ] **Step 4: PASS**, **Commit** — `fix(auth): unify registration responses and password policy; validate order email`

### Task 7: Giới hạn token thiết bị

**Files:**
- Modify: `app/api/notifications/device-token/route.ts:60-110`
- Test: `tests/notifications/*` (mở rộng)

- [ ] **Step 1: Test thất bại** — token > 4096 ký tự → 400; `deviceId`/`appVersion` > 128 → 400; đăng ký token thứ 11 của user → token active cũ nhất bị `isActive: false`.
- [ ] **Step 2: Chạy FAIL**
- [ ] **Step 3: Implement** — giới hạn độ dài trong hàm parse; trong transaction sau khi upsert: lấy token active của user theo `updatedAt desc`, vô hiệu hóa từ token thứ 11 trở đi (`MAX_ACTIVE_DEVICE_TOKENS = 10`).
- [ ] **Step 4: PASS**, **Commit** — `fix(notifications): cap device token size and count per user`

### Task 8: Dockerfile dùng pnpm, xóa package-lock.json

**Files:**
- Delete: `package-lock.json`
- Modify: `Dockerfile` (stage `deps`, `migrate`, `builder`)

- [ ] **Step 1: Implement** — bật `corepack enable` trong stage `base`; `deps`: copy `package.json pnpm-lock.yaml pnpm-workspace.yaml`, `RUN pnpm install --frozen-lockfile --ignore-scripts`; `migrate`: `pnpm exec prisma migrate deploy`; `builder`: `pnpm build`. Xóa `package-lock.json`.
- [ ] **Step 2: Kiểm chứng** — `docker build --target runner -t bakery-web:test .` thành công (nếu máy không có Docker → ghi rõ vào PR là chưa kiểm).
- [ ] **Step 3: Commit** — `build(docker): install with pnpm and drop stale package-lock`

### Task 9: Hardening rẻ cho các mục needs_validation

**Files:**
- Modify: `app/api/chat/route.ts:222-266`, `lib/email.ts:61,92`, `app/api/public/merch-impressions/route.ts`, `app/api/auth/login/route.ts:30`, `app/api/orders/route.ts:1014`, `lib/cloudinary.ts:30`
- Test: `tests/chat-route-cache.test.ts`, `tests/products/merch-impressions-route.test.ts`, `tests/auth/auth-endpoints.test.ts`, `tests/orders/*`, `tests/products/upload-route.test.ts` (mở rộng)

- [ ] **Step 1: Test thất bại** — (a) chat `message` 1001 ký tự hoặc `history` 11 mục hoặc `history` sai kiểu → 400; (b) `NODE_ENV=production` không có SMTP → `sendEmail` trả `false`; (c) merch-impressions chỉ log field whitelist, body > 4 KB → 413; (d) login có `Origin` khác `NEXT_PUBLIC_APP_URL` → 403, không có `Origin` (mobile) → cho qua, `Content-Type` không phải JSON → 415; (e) đơn có `customerAddress` mà `deliveryMethod` ≠ `'delivery'` → tính phí giao hàng (hoặc bỏ địa chỉ khi pickup — chọn theo UI checkout hiện tại); (f) upload gọi Cloudinary với `resource_type: 'image'`.
- [ ] **Step 2: Chạy FAIL**
- [ ] **Step 3: Implement** từng mục theo test; mỗi mục một commit nhỏ.
- [ ] **Step 4: PASS**, **Commit** — `fix(security): harden chat input, email fallback, impressions log, login origin, delivery fee, upload type`

### Task 10: Verify tổng + cập nhật báo cáo

- [ ] `pnpm validate` xanh.
- [ ] Smoke thủ công (dev, cổng 3000): đăng nhập Google web; đăng nhập Google trên app mobile trỏ vào dev; admin sửa sản phẩm + xóa ảnh; khách thường gọi `DELETE /api/upload/delete` → 403; `GET /api/public/products` không còn `costPrice`.
- [ ] Đánh dấu các mục đã sửa trong bảng A.2 của `bao-cao-audit-2026-10-27.md` (cột "Task" → "Đã sửa — PR #…").
- [ ] PR vào `dev`, ghi ảnh hưởng tới bakery-mobile (Task 1: bỏ `accessToken`; Task 6: shape phản hồi đăng ký).
