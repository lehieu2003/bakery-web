<!-- Title: Conventional Commits, ví dụ `feat(orders): add CSV export` — sẽ là commit squash trên dev. -->

## Tóm tắt

<!-- Thay đổi gì, vì sao. Link plan/spec/issue. -->

## Loại thay đổi

- [ ] feat · [ ] fix · [ ] refactor/perf · [ ] test/docs/chore · [ ] hotfix · [ ] release

## Rủi ro & ảnh hưởng

- [ ] Có thay đổi `prisma/schema.prisma` (kèm migration mới, không sửa migration cũ)
- [ ] Có thay đổi API contract (`app/api/**`) — ảnh hưởng tới **bakery-mobile**: <!-- mô tả hoặc "không" -->
- [ ] Cần biến môi trường mới (đã thêm vào `.env.example`)
- [ ] Ảnh hưởng auth/phân quyền/thanh toán

<!-- Ghi chú rủi ro, cách rollback nếu cần. -->

## Kiểm tra

- [ ] `pnpm validate` xanh (lint · typecheck · test:node · test:vitest:ci · build)
- [ ] Đã kiểm tra thủ công (mô tả bên dưới / ảnh chụp nếu đổi UI)

```
<!-- Dán kết quả chính: số test pass, lint 0 error, build OK -->
```
