---
name: open-pr
description: Đẩy nhánh task lên GitHub và mở Pull Request vào dev (hoặc master với hotfix) theo template, sau khi gate validate đã xanh. Dùng khi người dùng muốn tạo PR/MR, "đẩy lên review", hoặc task đã xong.
---

# Mở PR vào dev

## Điều kiện trước

1. Đang ở nhánh task (không phải `master`/`dev`); working tree sạch (`git status --porcelain` rỗng).
2. `git fetch origin` rồi kiểm tra nhánh không bị tụt quá xa `origin/dev`:
   `git log --oneline HEAD..origin/dev`. Nếu có commit mới trên dev → hỏi người dùng
   rebase (`git rebase origin/dev`) hay merge.
3. `pnpm validate` (bản đầy đủ) xanh trên HEAD hiện tại. Chưa chạy → chạy skill `validate` trước.

## Mở PR

```bash
git push -u origin HEAD
gh pr create --base dev --title "<type>(<scope>): <mô tả>" --body-file <file>
```

- **Base**: `dev`. Ngoại lệ: `hotfix/*` → `master`; `release/*` → `master` (skill `release`).
- **Title**: Conventional Commits — vì PR vào dev được *squash merge*, title chính là commit trên dev.
  Kiểm tra: `bash scripts/git-conventions.sh title "<title>"`.
- **Body**: điền theo `.github/pull_request_template.md` — tóm tắt, lý do, rủi ro/ảnh hưởng
  (DB migration, API contract, ảnh hưởng tới bakery-mobile), các lệnh đã chạy kèm kết quả thật,
  link plan/spec/issue. Ghi file body vào scratchpad, không vào repo.

## Sau khi mở

- Đưa link PR cho người dùng; chạy `gh pr checks <số>` nếu được hỏi về CI.
- KHÔNG tự merge PR (hook sẽ chặn `gh pr merge`).
