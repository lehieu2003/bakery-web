---
name: release
description: Chuẩn bị bản phát hành production — tạo nhánh release từ dev, bump version, mở PR release vào master. Chỉ chạy khi người dùng yêu cầu release.
disable-model-invocation: true
---

# Release dev → master

`master` = code đang chạy production. Chỉ thay đổi qua PR từ `release/*` (hoặc `hotfix/*`).

1. Hỏi người dùng số version mới (SemVer `X.Y.Z`) nếu chưa có. Xem version hiện tại trong `package.json`.
2. Tạo nhánh: `git fetch origin && git switch -c release/X.Y.Z origin/dev`.
3. Bump `"version"` trong `package.json` → commit `chore(release): vX.Y.Z`.
4. `pnpm validate` (đầy đủ) phải xanh.
5. Liệt kê thay đổi: `git log --no-merges --format='- %s' origin/master..HEAD` → đưa vào body PR,
   gom theo type (feat / fix / khác). Nêu rõ migration DB cần chạy trên production nếu có
   (`git diff --stat origin/master..HEAD -- prisma/migrations`).
6. `git push -u origin HEAD` rồi `gh pr create --base master --title "chore(release): vX.Y.Z"`.
7. Nhắc người dùng: merge bằng **merge commit** (không squash), sau đó tag
   `git tag vX.Y.Z <merge-sha> && git push origin vX.Y.Z`, và mở PR `master → dev` nếu master có
   commit mà dev chưa có (hotfix).
