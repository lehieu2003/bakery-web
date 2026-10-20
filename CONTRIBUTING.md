# Quy trình làm việc (Git workflow & governance)

Áp dụng cho mọi người và mọi agent (Claude, Codex…). Các quy tắc được ép bằng git hooks
(`.githooks/`), CI (`.github/workflows/ci.yml`) và hook của Claude (`.claude/hooks/`).

## Nhánh

| Nhánh | Vai trò | Thay đổi bằng |
|---|---|---|
| `master` | Code production — build/deploy từ đây | PR từ `release/*` hoặc `hotfix/*` (merge commit) |
| `dev` | Nhánh tích hợp — mọi task merge vào đây | PR từ nhánh task (squash merge) |
| `<type>/<mô-tả>` | Một task | Commit trực tiếp |

**Không commit / push trực tiếp lên `master` hay `dev`.**

Tên nhánh task: `<type>/<mô-tả-kebab-case>` — chữ thường, số, `.`, `_`, `-`.

| type | Dùng cho | Tách từ → PR vào |
|---|---|---|
| `feature` | Tính năng mới | `dev` → `dev` |
| `fix` | Sửa lỗi | `dev` → `dev` |
| `refactor`, `perf`, `test`, `docs`, `chore`, `ci` | Tương ứng | `dev` → `dev` |
| `hotfix` | Lỗi production khẩn cấp | `master` → `master` (rồi đồng bộ lại `dev`) |
| `release` | Chuẩn bị phát hành `X.Y.Z` | `dev` → `master` |

Ví dụ: `feature/orders-csv-export`, `fix/checkout-vnpay-callback`, `release/1.4.0`.

## Commit message — Conventional Commits

```
<type>(<scope>): <mô tả ngắn, mệnh lệnh>      ← header ≤ 100 ký tự

<body: vì sao thay đổi, ảnh hưởng — tuỳ chọn>

<footer: BREAKING CHANGE: …, Refs #123 — tuỳ chọn>
```

- `type` ∈ `feat` `fix` `chore` `docs` `refactor` `test` `perf` `build` `ci` `style` `revert`
- `scope` chữ thường (ví dụ `orders`, `auth`, `admin`, `story-6.2`); thay đổi phá vỡ tương thích thêm `!`: `feat(api)!: …`
- Mỗi commit một ý, build/test được. Không commit secret (`.env`), file build, thay đổi lạ không thuộc task.

Hook `commit-msg` kiểm tra header; CI kiểm tra lại mọi commit trong PR và PR title.

## Vòng đời một task

1. **Tạo nhánh** từ `dev` mới nhất: `git fetch origin && git switch -c feature/xyz origin/dev`
2. **Code + test**, commit theo quy ước.
3. **Validate** (bắt buộc trước PR): `pnpm validate` — xem bảng dưới.
4. **Cập nhật với dev** nếu dev đã đi tiếp: `git fetch origin && git rebase origin/dev` (rồi validate lại).
5. **Mở PR vào `dev`** theo template; title theo Conventional Commits (squash merge sẽ dùng title này).
6. **Review + CI xanh** → người review merge bằng **Squash and merge**. Xoá nhánh sau khi merge.

Nhánh nhiều commit có ý nghĩa riêng (ví dụ thực thi plan theo từng task) có thể dùng
**Rebase and merge** để giữ từng commit — mọi commit đều đã qua kiểm tra quy ước.

## Gate trước khi mở PR — `pnpm validate`

`scripts/validate.sh` chạy lần lượt (dừng ở bước lỗi đầu tiên):

| # | Bước | Lệnh |
|---|---|---|
| 1 | Tên nhánh | `scripts/git-conventions.sh branch` |
| 2 | Commit messages từ `origin/dev` | `scripts/git-conventions.sh commits origin/dev` |
| 3 | Lint (0 error) | `pnpm lint` |
| 4 | Typecheck | `pnpm typecheck` |
| 5 | Node tests | `pnpm run test:node` |
| 6 | Component tests | `pnpm run test:vitest:ci` |
| 7 | Production build | `pnpm build` (bỏ qua bằng `--skip-build` khi lặp nhanh) |

CI chạy lại bước 1–6 trên mọi PR (cùng kiểm tra PR title và nguồn PR vào `master`); bước 7 cần `.env`
nên chỉ chạy local — bắt buộc trước khi mở PR.

Ngoài ra, theo loại thay đổi:
- Đổi `prisma/schema.prisma` → có migration mới trong `prisma/migrations/` cùng PR; không sửa migration cũ.
- Đổi API contract → cập nhật `types/api.types.ts` + consumer, ghi ảnh hưởng tới **bakery-mobile** trong PR.
- Thay đổi UI → kiểm tra thủ công trên trình duyệt, đính kèm ảnh chụp nếu thay đổi giao diện.

## Release & hotfix

- **Release**: `release/X.Y.Z` từ `dev` → bump `version` trong `package.json` (`chore(release): vX.Y.Z`)
  → validate → PR vào `master` → **merge commit** → tag `vX.Y.Z` trên `master`.
- **Hotfix**: `hotfix/<mô-tả>` từ `master` → PR vào `master` → sau khi merge, mở PR `master → dev`
  để dev không mất bản sửa.

## Cài đặt local

`pnpm install` tự bật git hooks (`git config core.hooksPath .githooks`). Nếu cần bật tay, chạy lệnh đó.
Maintainer cần push thẳng lên nhánh bảo vệ (hiếm, ví dụ khởi tạo): `ALLOW_PROTECTED_PUSH=1 git push …`.
