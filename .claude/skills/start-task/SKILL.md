---
name: start-task
description: Tạo nhánh riêng cho một task mới từ origin/dev (hoặc origin/master với hotfix) theo quy ước đặt tên. Dùng trước khi sửa code cho bất kỳ task/feature/bugfix nào, hoặc khi đang đứng trên master/dev mà cần thay đổi code.
---

# Bắt đầu task trên nhánh riêng

Mỗi task = một nhánh, tách từ `dev` mới nhất. Không bao giờ commit trên `master`/`dev`.

## Các bước

1. **Kiểm tra working tree**: `git status --porcelain`. Nếu có thay đổi chưa commit, hỏi người dùng
   (commit vào nhánh hiện tại / để nguyên / dùng worktree riêng). Không tự stash hay discard.
2. **Chọn loại nhánh** theo bản chất task:
   - `feature/` tính năng mới · `fix/` sửa lỗi · `refactor/` · `test/` · `docs/` · `chore/` · `perf/` · `ci/`
   - `hotfix/` — CHỈ cho lỗi production khẩn cấp; tách từ `origin/master`, PR vào `master`.
3. **Đặt tên**: `<type>/<mô-tả-kebab-case>`, chữ thường, ngắn gọn (≤ 50 ký tự), có scope nếu được
   (ví dụ `feature/orders-csv-export`, `fix/checkout-vnpay-callback`). Kiểm tra:
   `bash scripts/git-conventions.sh branch <tên>`.
4. **Tạo nhánh**:
   ```bash
   git fetch origin
   git switch -c <tên> origin/dev        # hotfix: origin/master
   ```
   Nếu người dùng muốn giữ nguyên checkout hiện tại, dùng worktree:
   `git worktree add .worktrees/<tên-ngắn> -b <tên> origin/dev`.
5. Báo lại: tên nhánh, base commit (`git log --oneline -1`).

## Trong khi làm

- Commit nhỏ, mỗi commit một ý, message Conventional Commits (xem CONTRIBUTING.md) —
  hook `commit-msg` sẽ chặn message sai.
- Chỉ stage file thuộc task; không stage thay đổi lạ đã có sẵn trong working tree.
- Xong việc → skill `validate`, rồi `open-pr`.
