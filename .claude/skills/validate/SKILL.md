---
name: validate
description: Chạy gate kiểm tra trước PR (tên nhánh, commit message, lint, typecheck, node tests, vitest, build) bằng scripts/validate.sh và sửa cho tới khi xanh. Dùng trước khi mở PR, trước khi báo task hoàn thành, hoặc khi người dùng hỏi "đã pass chưa".
---

# Validate trước PR

Gate duy nhất: `scripts/validate.sh`. CI chạy lại mọi bước trừ build (build cần `.env`), nên build
local là trách nhiệm của người mở PR. Không tự chế lệnh khác thay thế.

## Chạy

```bash
pnpm validate                 # đầy đủ, gồm build
pnpm validate --skip-build    # vòng lặp nhanh khi đang sửa; trước PR phải chạy bản đầy đủ
```

`--base <ref>` nếu nhánh không tách từ `origin/dev` (ví dụ hotfix: `--base origin/master`).

## Khi fail

- **Branch name / commit message**: đổi tên nhánh (`git branch -m`) hoặc sửa message
  (`git commit --amend` cho commit cuối; nhiều commit thì hỏi người dùng trước khi rebase).
- **Lint / typecheck / test**: sửa nguyên nhân gốc. KHÔNG thêm `eslint-disable`, `@ts-ignore`,
  `.skip`, không nới rule, không xoá test để cho xanh — nếu thật sự cần, hỏi người dùng.
- **Build** cần `.env` (copy từ `.env.example`) — thiếu biến môi trường thì báo người dùng, không bịa giá trị.
- Lỗi có sẵn từ trước (không do thay đổi của task): báo rõ, không âm thầm sửa lan ra ngoài scope.

## Báo cáo

Nêu kết quả từng bước với số liệu thật (số test pass/fail, số lỗi lint). Nếu bước nào bị bỏ qua
(ví dụ `--skip-build`), nói rõ.
