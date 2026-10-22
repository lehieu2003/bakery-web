# XSS Follow-up Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khép kín 2 điểm hở XSS còn lại: (a) nội dung blog render HTML thô, (b) access token lưu localStorage.

**Architecture:** (a) thêm `sanitize-html` (pure JS, chạy được cả node lẫn browser, không cần jsdom) bọc nội dung blog qua whitelist; (b) xoá localStorage token — auth chạy hoàn toàn qua cookie HttpOnly (server đã Set-Cookie chuẩn từ trước; fetch same-origin tự gửi cookie).

**Tech Stack:** Next.js 16, `sanitize-html` (+ `@types/sanitize-html` — 2 deps mới ĐƯỢC PHÉP cho task này vì sanitizer tự viết bằng regex là rủi ro bảo mật lớn hơn).

**Spec:** `bao-cao-bao-mat-2026-10-03.md` mục "Điểm hở còn lại" (2 lưu ý cuối).

## Global Constraints

- Không đổi hành vi với khách vãng lai; login/logout/admin flows phải hoạt động như trước (verify bằng test + smoke).
- Mobile/API clients dùng Bearer không bị phá: server TIẾP TỤC trả token trong body login/refresh; chỉ bỏ việc BROWSER lưu/dùng nó.
- `pnpm typecheck` + node + vitest sạch sau mỗi task.
- Node tests: `pnpm test:node` (glob đã quote, quét cả tests/ gốc).

## Review Focus

- Auth provider phải gọi /auth/me MỌI LÚC khi mount (không gate theo localStorage nữa) — nếu không sẽ tái diễn bug "cookie còn hiệu lực mà UI hiện Đăng nhập".
- Sanitizer whitelist phải giữ lại headings/p/a/img mà blog editor sinh ra — nếu cắt mất nội dung hợp lệ là regression hiển thị.
- Không phá mobile Bearer: endpoint bodies vẫn trả token.

---

### Task 1: Sanitize nội dung blog trước khi render

**Files:**
- Modify: `package.json` (+ `sanitize-html`, `@types/sanitize-html`)
- Create: `lib/sanitize.ts` — `sanitizeHtmlContent(html: string): string`
- Modify: `components/screens/BlogPostDetailScreen.tsx` (dòng `dangerouslySetInnerHTML={{ __html: post.content }}` → bọc qua `sanitizeHtmlContent`)
- Test: `tests/sanitize-html.test.ts` (node:test)

**Interfaces:**
- Produces: `sanitizeHtmlContent(html)` — giữ whitelist: `h1..h6, p, br, hr, strong, em, b, i, u, s, blockquote, ul, ol, li, a[href] (http/https/mailto, thêm rel="noopener noreferrer nofollow"), img[src] (https only), figure, figcaption, table, thead, tbody, tr, th, td, code, pre, span`; strip mọi thuộc tính sự kiện (`on*`), `style` attribute, `script/iframe/object/embed/form` bị bỏ hoàn toàn kèm nội dung.

- [ ] **Step 1: Viết test thất bại** — cases: (1) `<p>Chào <strong>bánh</strong></p>` giữ nguyên; (2) `<img src="https://x/y.png" onerror="alert(1)">` → mất `onerror`, giữ img+src; (3) `<script>alert(1)</script>` → biến mất hoàn toàn; (4) `<a href="https://x" onclick="h()">` → mất onclick, thêm rel; (5) `<img src="http://insecure/x">` → mất (chỉ https); (6) text tiếng Việt có dấu giữ nguyên; (7) iframe/embed → biến mất.

- [ ] **Step 2: FAIL → implement → PASS** — `pnpm test:node` + `pnpm typecheck`.

- [ ] **Step 3: Áp vào BlogPostDetailScreen** (import từ `@/lib/sanitize`).

- [ ] **Step 4: Verify thủ công** — một bài blog thật render đúng heading/ảnh/link (browser /blog/<slug> qua controller).

- [ ] **Step 5: Commit** — `feat(security): sanitize blog HTML against stored XSS`

### Task 2: Bỏ localStorage token — auth cookie-only

**Files:**
- Modify: `lib/auth-token.ts` → xoá localStorage + document.cookie writes; giữ module tối giản (hoặc xoá hẳn + cập nhật importers — ưu tiên GIỮ file với API rỗng/compat nếu ít importers hơn)
- Modify: `lib/api/client.ts` request interceptor (bỏ Authorization từ localStorage; thêm `credentials: 'include'` tường minh)
- Modify: `providers/auth-provider.tsx` `initAuth` → LUÔN gọi `authService.me()` khi mount (bỏ gate `if (!token)`); `logout` không còn `authToken.remove()`
- Modify: `services/auth.service.ts` (login/register không còn gọi `authToken.set`)
- Test: cập nhật tests nào mock `@/lib/auth-token` / localStorage (grep `authToken` trong tests/ + vitest)

**Interfaces:**
- Consumes: server đã Set-Cookie `bakery_session` HttpOnly (có sẵn); `getCurrentUserFromRequest` cookie-fallback (có sẵn).
- Produces: client KHÔNG còn đọc/ghi token ở bất kỳ đâu; mọi API call xác thực bằng cookie; auth state quyết định bằng /auth/me.

- [ ] **Step 1: Grep bản đồ phụ thuộc** — `grep -rn "authToken\|auth-token" lib services providers hooks components app tests --include="*.ts*" | grep -v node_modules` — xử lý TẤT CẢ importers (danh sách cụ thể ghi vào report).

- [ ] **Step 2: Implement** — theo Interfaces trên;Middleware `proxy.ts` đọc `bakery_session` từ request.cookies — cookie HttpOnly do server set vẫn xuất hiện ở đó (không cần client write).

- [ ] **Step 3: Suites sạch + typecheck.**

- [ ] **Step 4: Smoke qua curl/browser (controller sẽ chạy lại) — tự kiểm: login → localStorage TRỐNG (`localStorage.getItem('bakery_auth_token') === null`) → refresh trang vẫn còn đăng nhập (auth/me qua cookie) → logout → me 401.**

- [ ] **Step 5: Commit** — `feat(security): cookie-only auth, drop localStorage token`
