# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vá 6 lỗ hổng bảo mật đã phát hiện trong audit 2026-10-03 (rate limit auth, security headers, upload validation, JSON-LD escape, role cookie, session token hashing) + xoay mật khẩu admin.

**Architecture:** Tất cả sửa đổi nằm trong `bakery-web` (Next.js 16 App Router). Auth rate limit tái dùng `enforceIpRateLimit` của `lib/rate-limit.ts`. Security headers đặt trong `proxy.ts` (middleware Next 16). Session token băm SHA-256 tại rest, kèm script chuyển đổi dữ liệu cũ. Spec nguồn: `bao-cao-bao-mat-2026-10-03.md` (thư mục dự án).

**Tech Stack:** Next.js 16 route handlers, Prisma (Postgres/Supabase), node:test + vitest.

**Spec:** `/Users/lehieu/Projects/personal/bakery/bao-cao-bao-mat-2026-10-03.md`

## Global Constraints

- Không thêm dependency mới — dùng `lib/rate-limit.ts`, `crypto`, pattern có sẵn.
- Tất cả test mới dùng node:test (`tests/**/*.test.ts`) theo pattern `tests/products/*.test.ts`, hoặc vitest nếu test component.
- Sau mỗi task: `pnpm typecheck` sạch + suite liên quan pass.
- Không đổi UX publicly-visible ngoài bảo mật (trừ khi task ghi rõ).
- Dev server chạy cổng 3000 (đừng restart nếu không cần); production đo ở 3001.

## Review Focus

- CSP làm gãy Next dev (HMR dùng ws://) → header CSP phải cho `connect-src` gồm `ws:` và `script-src` có `'unsafe-eval'` trong dev; Task 2 có bước kiểm trang chủ render ở cả 3000 và 3001.
- Rate limit theo IP chặn người dùng chung IP (NAT/công ty) → ngưỡng đăng nhập 10 lần/15 phút, chỉ đếm lần THẤT BẠI; login thành công phải reset bộ đếm của IP đó cho scope login.
- Hash session token làm rơi phiên đang đăng nhập → script chuyển đổi chạy NGAY sau deploy code, và task 6 có bước smoke login/refresh/logout qua curl cookie jar.
- Upload từ chối ảnh iPhone HEIC → whitelist gồm `image/heic` và `image/avif`.
- `dangerouslySetInnerHTML` của JSON-LD khi giá trị chứa `</script>` → Task 4 có test pin hành vi escape `<` → `\u003c`.

---

### Task 1: Rate limit các route đăng nhập/đăng ký/quên mật khẩu

**Files:**
- Modify: `lib/rate-limit.ts` (thêm entry `RATE_LIMITS`)
- Modify: `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/register/verify/route.ts`, `app/api/auth/verify-email/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/auth/reset-password/verify/route.ts`
- Test: `tests/auth/auth-rate-limit.test.ts` (mới)

**Interfaces:**
- Consumes: `enforceIpRateLimit(request, scope, config)`, `RATE_LIMITS`, `__resetIpRateLimitForTests()` từ `@/lib/rate-limit` (đã có).
- Produces: `RATE_LIMITS.LOGIN_PER_IP`, `RATE_LIMITS.REGISTER_PER_IP`, `RATE_LIMITS.OTP_PER_IP` (shape giống entry hiện có trong `RATE_LIMITS`; giá trị: LOGIN 10 lần / 15 phút, REGISTER 5 / giờ, OTP 10 / giờ). Scope string: `'auth-login'`, `'auth-register'`, `'auth-otp'`.

- [ ] **Step 1: Viết test thất bại** — `tests/auth/auth-rate-limit.test.ts`: gọi `handleLoginRequest` (deps inject như pattern `tests/products/*.test.ts` — xem route có deps hay không; nếu route đọc trực tiếp prisma thì test qua POST handler với global fetch mock KHÔNG được — thay vào đó extract phần rate limit ra helper `checkAuthRateLimit(request, scope)` trong route file và test helper: lần 1..10 trả `null`, lần 11 trả `{ status: 429 }`, dùng `__resetIpRateLimitForTests()` giữa các test.

- [ ] **Step 2: Chạy test xác nhận FAIL** — `pnpm vitest run tests/auth/auth-rate-limit.test.ts` (nếu để node:test thì `pnpm test:node -- tests/auth/`). Expected: FAIL (helper chưa tồn tại).

- [ ] **Step 3: Implement** — thêm 3 entry `RATE_LIMITS`; trong mỗi route auth, ngay đầu handler: `const rateLimit = enforceIpRateLimit(request, 'auth-login', RATE_LIMITS.LOGIN_PER_IP)` (scope tương ứng từng route); nếu `!ok` trả `429` kèm header `Retry-After` và body `{ success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' }`.

- [ ] **Step 4: Chạy test PASS + typecheck** — Expected: PASS; `pnpm typecheck` sạch.

- [ ] **Step 5: Commit** — `git commit -m "feat(security): rate limit auth routes against brute force"`

### Task 2: Security headers trong proxy.ts

**Files:**
- Modify: `proxy.ts`

**Interfaces:**
- Produces: mọi response (site-wide) có header: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (CHỈ khi `x-forwarded-proto` = https hoặc request.url bắt đầu https), `Content-Security-Policy` theo chuỗi dưới.

- [ ] **Step 1: Implement** — mở rộng `config.matcher` thành `['/((?!_next/static|_next/image|favicon.ico).*)']` (loại asset tĩnh); trong handler, lấy `const response = NextResponse.next()` rồi set các header trên `response.headers` trước khi return; giữ nguyên logic redirect admin/profile hiện có (chỉ bỏ phần đọc cookie `bakery_role` theo Task 5 nếu task 5 chạy trước — nếu chạy sau thì Task 5 sửa tiếp). Chuỗi CSP:
  `default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`

- [ ] **Step 2: Kiểm chứng thủ công** — `curl -sI http://localhost:3001/ | grep -iE "x-frame|content-security|strict-transport|x-content"` (prod 3001 cần `pnpm build` + restart);Expected: thấy 4/5 header (HSTS vắng nếu http). Trang chủ + trang sản phẩm render ảnh/Font bình thường ở cổng 3000 (dev) và 3001.

- [ ] **Step 3: Commit** — `git commit -m "feat(security): site-wide security headers in proxy middleware"`

### Task 3: Siết validation API upload

**Files:**
- Modify: `app/api/upload/route.ts`
- Test: `tests/products/upload-route.test.ts` (mới, node:test, pattern deps-inject như `tests/products/public-products-route.test.ts`)

**Interfaces:**
- Produces: hàm `validateUploadPayload(body: unknown): { ok: true; files: string[] } | { ok: false; error: string }` export từ route file (dùng bởi handler + test). Quy tắc: mỗi file phải khớp `^data:image\/(png|jpe?g|webp|avif|heic);base64,[A-Za-z0-9+/=]+$`; kích thước decoded ≤ 5MB (độ dài base64 × 3/4); tối đa 5 file; `folder` bị bỏ qua — luôn dùng `'bakery-shop'`.

- [ ] **Step 1: Viết test thất bại** — cases: (a) data URL `text/plain` → error; (b) ảnh base64 vượt 5MB (tạo chuỗi 'A'.repeat(7_000_000)) → error; (c) 6 file hợp lệ → error; (d) 1 file png hợp lệ → ok; (e) `folder: 'hacker'` → ok nhưng handler vẫn upload vào `'bakery-shop'`.

- [ ] **Step 2: Chạy FAIL** — Expected: FAIL (validateUploadPayload chưa có).

- [ ] **Step 3: Implement** — extract `validateUploadPayload`; trong handler gọi trước khi upload; bỏ tham số `folder` từ client (hardcode `'bakery-shop'`).

- [ ] **Step 4: PASS + typecheck + commit** — `git commit -m "feat(security): validate upload payload (image-only, size, count)"`

### Task 4: Escape JSON-LD chống `</script>` breakout

**Files:**
- Create: `lib/json-ld.ts` (export `safeJsonLdString(value: unknown): string`)
- Modify: `app/(web)/blog/[slug]/page.tsx`, `app/(web)/products/[id]/page.tsx`, `app/(web)/categories/[...slug]/page.tsx` (các chỗ `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`)
- Test: `tests/json-ld.test.ts` (node:test)

**Interfaces:**
- Produces: `safeJsonLdString(value)` = `JSON.stringify(value).replace(/</g, '\\u003c')`.

- [ ] **Step 1: Viết test + FAIL** — `safeJsonLdString({ a: '</script><script>alert(1)</script>' })` không chứa chuỗi `</script>` theo nghĩa đen và kết quả vẫn `JSON.parse` được về đúng object.

- [ ] **Step 2: Implement + áp vào 3 trang** (thay `JSON.stringify(...)` bằng `safeJsonLdString(...)`).

- [ ] **Step 3: PASS + typecheck + commit** — `git commit -m "fix(security): escape JSON-LD against script tag breakout"`

### Task 5: Bỏ cookie `bakery_role` (client-ghi được)

**Files:**
- Modify: `proxy.ts` (bọc đọc `bakery_role` — điều hướng admin chỉ dựa `sessionToken` presence; trang admin tự xác minh qua /auth/me như hiện狀)
- Modify: `lib/auth-token.ts` (bỏ dòng set + clear cookie `bakery_role`)

- [ ] **Step 1: Implement** — trong `lib/auth-token.ts` xoá 2 dòng cookie role; trong `proxy.ts` thay điều kiện `userRole !== 'ADMIN'` bằng: có sessionToken thì cho qua (trang dashboard tự xử lý khi không phải admin — kiểm tra `app/admin` layout đã redirect client-side khi role không phải ADMIN; nếu chưa có thì thêm check client vào admin layout: gọi /auth/me, không phải ADMIN → router.push('/')).

- [ ] **Step 2: Kiểm chứng thủ công** — đăng nhập admin → /admin/dashboard vẫn vào được; xoá cookie bakery_role trong DevTools → vẫn vào được; đăng nhập customer → truy cập /admin/dashboard bị đẩy về '/'. suites + typecheck pass.

- [ ] **Step 3: Commit** — `git commit -m "fix(security): stop trusting client-writable bakery_role cookie"`

### Task 6: Băm session token tại rest

**Files:**
- Modify: `lib/session.ts` (thêm `hashSessionToken(token: string): string` = SHA-256 hex; `createSession` lưu hash; mọi lookup (`getSessionByToken`, `deleteSession`, revoke/refresh trong lib/auth*) tra cứu theo hash)
- Create: `scripts/hash-existing-sessions.mjs` (UPDATE mỗi row: token = SHA-256(token cũ); chạy MỘT lần)
- Test: `tests/session-token-hash.test.ts` (node:test)

**Interfaces:**
- Consumes: `crypto.createHash('sha256')`.
- Produces: `hashSessionToken` export; mọi đường đọc/ghi token trong `lib/session.ts` và `lib/auth-token.ts` (nếu có server-side verify) đi qua hàm này.

- [ ] **Step 1: Viết test + FAIL** — `hashSessionToken('abc')` = giá trị SHA-256 hex đã tính sẵn trong test, dài 64, xác định (gọi 2 lần bằng nhau).

- [ ] **Step 2: Implement** — thay mọi chỗ so sánh/lưu token; grep `findUnique({ where: { token }` đảm bảo đã qua hash.

- [ ] **Step 3: Chuyển đổi dữ liệu cũ** — chạy `node --env-file=.env scripts/hash-existing-sessions.mjs` NGAY sau khi deploy code đổi (trước khi chạy, sessions cũ không đăng nhập được — chấp nhận được, user đăng nhập lại).

- [ ] **Step 4: Smoke auth qua curl cookie jar** — login → /api/auth/me 200 → refresh 200 → logout → me 401. PASS + typecheck + commit — `git commit -m "feat(security): hash session tokens at rest"`

### Task 7: Xoay mật khẩu admin trên DB thật

**Files:**
- Create: `scripts/set-admin-password.mjs` (argv password; dùng `hashPassword` từ `lib/password.ts`; upsert user admin@bakeryshop.com)

- [ ] **Step 1: Implement script + chạy với mật khẩu mạnh generate 20 ký tự** — in ra stdout (chỉ lần này, không lưu vào repo).

- [ ] **Step 2: Báo mật khẩu mới cho Hieu trong chat** + smoke login admin bằng mật khẩu mới.

- [ ] **Step 3: Commit** — `git commit -m "chore(security): admin password rotation script"`

### Task 8: Verify tổng + cập nhật báo cáo

- [ ] **Step 1:** `pnpm typecheck && pnpm test:node && pnpm vitest run` — tất cả PASS.
- [ ] **Step 2:** probe lại như audit: login sai 11 lần → 429; `curl -sI` thấy headers; upload file text → 400.
- [ ] **Step 3:** cập nhật `bao-cao-bao-mat-2026-10-03.md` đánh dấu trạng thái đã vá từng mục; commit `docs(security): mark hardening items fixed`.
