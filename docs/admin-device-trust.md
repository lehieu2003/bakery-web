# Admin: một thiết bị tin cậy mỗi nền tảng

Tài khoản **ADMIN** chỉ đăng nhập được trên **1 trình duyệt (web) + 1 điện thoại (app)**. Khách hàng không bị ảnh hưởng.

## Luồng

| Đăng nhập (mật khẩu hoặc Google) | Kết quả |
|---|---|
| Từ thiết bị tin cậy của nền tảng đó | Đăng nhập ngay; phiên khác cùng nền tảng bị thu hồi |
| Từ thiết bị khác / lần đầu | **Chưa cấp phiên** — gửi mã 6 số tới email admin (kèm thiết bị, IP, giờ). `202 { requiresVerification, challengeId, email }` |
| `POST /api/auth/login/verify { challengeId, otp }` từ **cùng thiết bị**, mã đúng | Thiết bị mới thành tin cậy, **thiết bị cũ cùng nền tảng bị đăng xuất**, email cảnh báo "thiết bị mới" |
| App bản cũ (không gửi mã thiết bị) | `403` — yêu cầu cập nhật app |

- Mã: hết hạn 10 phút, tối đa 5 lần nhập sai; tối đa 5 mã / 15 phút / tài khoản (chặn spam mail khi lộ mật khẩu).
- Phiên admin: web 7 ngày, mobile 30 ngày (khách 30 ngày). Phiên admin **không gắn thiết bị** bị từ chối (kể cả phiên có từ trước bản này → admin phải đăng nhập lại một lần, xác minh bằng mã).
- Nhận diện thiết bị: web — cookie httpOnly `bakery_device`; app — header `x-client-platform: mobile` + `x-device-id` (lưu trong secure storage). Server chỉ lưu SHA-256 của mã thiết bị.

Code: `lib/auth/admin-device.ts` (quyết định + xác minh), `lib/session.ts` (gắn thiết bị vào phiên), `lib/auth/session-rotation.ts` (refresh giữ gắn kết), các route `app/api/auth/{login,login/verify,google/callback,google/mobile}`.

## Triển khai

1. **Chạy migration trước khi deploy** (build không tự migrate): `pnpm exec prisma migrate deploy` — `20261028150000_add_admin_trusted_devices` (thêm 2 cột vào `Session`, bảng `TrustedDevice`, `LoginChallenge`; chỉ thêm, không sửa dữ liệu).
2. Deploy web. Mọi admin đang đăng nhập bị đăng xuất; đăng nhập lại → nhận mã qua email → xác minh.
3. Admin dùng app cần bản app có mã thiết bị (bakery-mobile, cùng đợt).
4. Email phải gửi được (biến MAIL_* trên Vercel) — không có email thì admin không xác minh được thiết bị mới.

## Khẩn cấp

Mất thiết bị tin cậy / nghi bị chiếm tài khoản:

```bash
set -a; source .env; set +a
pnpm exec tsx scripts/reset-admin-devices.ts <email admin>
```

Xoá thiết bị tin cậy, đăng xuất mọi phiên, huỷ mã đang chờ. Đổi mật khẩu luôn nếu nghi lộ (`scripts/set-admin-password.ts`). Bảo vệ này dựa trên **email admin** — bật xác minh 2 bước cho hộp mail đó.
