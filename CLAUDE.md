# bakery-web — hướng dẫn cho Claude

Next.js (App Router) + Prisma/PostgreSQL + TypeScript strict. Là web shop + trang admin của tiệm bánh,
đồng thời là **backend API cho app Flutter `bakery-mobile`** (thư mục anh em `../bakery-mobile`).

@AGENTS.md
@CONTRIBUTING.md

## Quy tắc riêng cho Claude

- **Package manager là pnpm** (`pnpm-lock.yaml`, `packageManager` trong package.json). Không dùng npm/yarn,
  kể cả khi tài liệu cũ ghi `npm run …` — thay bằng `pnpm …`.
- **Nhánh**: trước khi sửa code, đảm bảo đang ở nhánh task — nếu đang ở `master`/`dev`, dùng skill
  `start-task`. Hook `.claude/hooks/guard-git.sh` chặn commit trên master/dev, push thẳng, force push,
  `--no-verify`, `gh pr merge`.
- **Xong task** = `pnpm validate` xanh (skill `validate`) → skill `open-pr`. Không báo "xong" khi chưa chạy gate;
  nếu bỏ bước nào, nói rõ.
- **Commit**: chỉ stage file thuộc task (không `git add -A` khi working tree có thay đổi lạ); message theo
  Conventional Commits; kết thúc message bằng dòng `Co-Authored-By` theo cấu hình của phiên.
- **DB**: không chạy `prisma migrate reset` / `db push`; tạo migration bằng `prisma migrate dev --name <tên>`
  chỉ khi người dùng đồng ý, và commit migration cùng thay đổi schema.
- **API dùng chung với mobile**: đổi shape response/route/auth của `app/api/**` → kiểm tra consumer trong
  `../bakery-mobile/lib/src/features/**/data/` và ghi ảnh hưởng vào PR.
- **Secrets**: không đọc/in `.env`; biến mới thêm vào `.env.example` với giá trị giả.

## Tài nguyên agent trong repo

- `.claude/skills/` — `start-task`, `validate`, `open-pr`, `release` (chỉ chạy khi người dùng yêu cầu).
  `code-review-and-quality` — tiêu chí review 5 trục (vendored từ addyosmani/agent-skills).
- `.claude/agents/code-reviewer.md` — review diff so với `origin/dev` trước PR lớn, áp dụng skill `code-review-and-quality`.
- `.agents/skills/` (BMAD), `_bmad/`, `docs/superpowers/` (plan/spec) — quy trình lập kế hoạch đang dùng;
  plan/spec mới đặt trong `docs/superpowers/{plans,specs}/YYYY-MM-DD-<tên>.md`.
- `.claude/settings.local.json` — cấu hình cá nhân, không commit.
