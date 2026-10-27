# Vấn đề tồn đọng

Các vấn đề đã biết, chưa xử lý. Mỗi mục ghi nguyên nhân, phương án và việc cần làm để quay lại sau.

## Job đối soát coupon chưa được lên lịch (ghi nhận 2026-10-27)

`/api/incentives/reconcile` giải phóng các reservation coupon bị treo (đơn MoMo/VNPay không bao giờ
thanh toán), nhưng không có lịch nào gọi nó: không có trong `vercel.json`, workflow hay tài liệu. Hệ quả:
lượt dùng coupon của đơn online bỏ dở không bao giờ được trả lại.

- [ ] Thêm vào `crons` của `vercel.json`. Vercel Cron chỉ gửi `Authorization: Bearer $CRON_SECRET`, nên
      đặt `INCENTIVES_RECONCILE_TOKEN` bằng cùng giá trị `CRON_SECRET` (route đã nhận Bearer token).
- [ ] Gói Hobby chỉ cho mỗi cron chạy một lần mỗi ngày; cân nhắc khi chọn ngưỡng
      `INCENTIVES_RECONCILE_OLDER_THAN_MINUTES`.

Đơn chuyển khoản chưa thanh toán đã có job riêng `/api/cron/expire-unpaid-orders` (chạy hằng ngày
00:00 giờ VN, hủy đơn sau `UNPAID_BANK_TRANSFER_TTL_HOURS`, trả kho và coupon).

## Web chậm do DB đặt trên VPS (ghi nhận 2026-10-27)

**Triệu chứng.** Cập nhật sản phẩm trong trang admin mất khoảng 2–3 giây dù vẫn thành công. Các route
admin có nhiều câu lệnh DB đều chậm theo cùng cách.

**Nguyên nhân.** Web chạy trên Vercel Singapore (`sin1`), còn PostgreSQL nằm trên VPS ở Việt Nam. Mỗi
lượt khứ hồi giữa hai nơi mất khoảng 100 ms. Web đã chậm từ khi chuyển DB từ Supabase (cùng vùng với
Vercel, ~1–2 ms) sang VPS. Việc bật SSL cho Postgres chỉ thêm ~0,2 s khi mở kết nối mới, không phải
nguyên nhân chính.

| Số đo (2026-10-27) | Giá trị |
| --- | --- |
| Khứ hồi VPS ↔ AWS Singapore (vùng của Vercel `sin1`) | ~100 ms |
| Câu lệnh DB nối tiếp trong `PUT /api/admin/products/[id]` | ~20–25 |
| Thời gian chờ mạng ước tính cho một lần cập nhật | ~2,5 s |
| Tải VPS lúc đo | load 0,24; Postgres 0% CPU |

Thời gian thực tế của từng request xem ở cột Duration trong Vercel → Logs.

### Phương án

Vercel không có vùng ở Việt Nam (gần nhất là `sin1` và `hkg1`), nhưng Next.js không bắt buộc chạy trên
Vercel. Khuyến nghị chọn **A**: khách chủ yếu ở Việt Nam, và cách này còn cho phép đóng Postgres/Redis
khỏi Internet.

| | A. Web chạy luôn trên VPS | B. Giữ Vercel, chuyển DB sang Singapore |
| --- | --- | --- |
| Độ trễ web ↔ DB | ~0 ms | ~1–2 ms |
| Độ trễ khách VN ↔ web | Thấp (server ở VN) | ~40–60 ms |
| Vận hành | Tự lo HTTPS, deploy, giám sát | Giữ nguyên: push là tự deploy, có preview và CDN |
| Chi phí | VPS hiện tại, có thể phải nâng lên 2 GB RAM | Thêm tiền DB hoặc VPS ở Singapore |
| Bảo mật DB/Redis | Đóng hẳn port ra Internet | Vẫn phải mở cho Vercel kết nối |

Repo đã gần sẵn sàng để tự host: `next.config.ts` đặt `output: 'standalone'` và đã có `Dockerfile`.
Thứ duy nhất phụ thuộc Vercel là `@vercel/analytics` (`app/layout.tsx`); ra khỏi Vercel nó chỉ không
còn số liệu, không gây lỗi.

### Việc cần làm nếu chọn A

- [ ] Sửa `Dockerfile` sang pnpm. Hiện nó chạy `npm ci` với `package-lock.json` đã cũ nên build thất bại.
- [ ] Build image trên GitHub Actions và đẩy lên GHCR; VPS chỉ pull về chạy. VPS hiện tại (1 CPU / 1 GB
      RAM) không đủ để build Next.js, nhưng đủ để chạy (~200–300 MB).
- [ ] Có tên miền trỏ về VPS, cấu hình nginx + Let's Encrypt cho HTTPS.
- [ ] Trong nginx, đặt `proxy_set_header X-Forwarded-For $remote_addr;` (ghi đè, không nối thêm) và không
      publish port 3000. `getClientIp` trong `lib/rate-limit.ts` tin header này; ra khỏi Vercel không còn
      ai ghi đè nó, nên nếu bỏ qua thì ai cũng qua mặt được rate-limit.
- [ ] Cho web, Postgres và Redis dùng chung mạng Docker; bỏ `ports:` của Postgres và Redis.
- [ ] Chuyển biến môi trường từ Vercel sang VPS, trỏ tên miền, rồi tắt project trên Vercel.

### Việc bảo mật VPS còn treo

Đã làm ngày 2026-10-27: SSH chỉ cho đăng nhập bằng key, chặn root, bật fail2ban và UFW, Postgres bật
SSL và chỉ nhận `hostssl`, đổi mật khẩu Redis. Còn lại (mục đầu tự hết nếu chọn A):

- [ ] Redis vẫn mở port 6379 ra Internet và chưa có TLS, nên mật khẩu Redis đi plaintext từ Vercel.
- [ ] Thay mật khẩu Redis bằng chuỗi ngẫu nhiên (`openssl rand -base64 32`); kiểm tra mật khẩu DB đã đổi.
- [ ] Tạo role Postgres riêng cho app, chỉ có quyền trên `bakery_db`, thay cho superuser `postgres`.
- [ ] `chmod 600` file `.env` cạnh docker-compose trên VPS (hiện đang là `664`).
