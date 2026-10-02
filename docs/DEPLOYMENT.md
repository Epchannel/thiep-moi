# Triển khai và vận hành

## Biến môi trường

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `3000` | Cổng HTTP |
| `NODE_ENV` | development | Đặt `production` để bật secure cookie và cache static asset |
| `ADMIN_SETUP_TOKEN` | sinh ngẫu nhiên | Token tùy chọn để setup admin đầu tiên |

Không đặt `ADMIN_SETUP_TOKEN` trong source code hoặc commit Git.

## Chạy production

```powershell
$env:NODE_ENV = 'production'
$env:PORT = '3000'
npm ci --omit=dev
npm start
```

Production phải chạy sau HTTPS reverse proxy. Khi `NODE_ENV=production`, cookie admin có cờ `Secure` và sẽ không hoạt động qua HTTP thuần.

## Persistent data

Hai đường dẫn phải được giữ khi deploy/redeploy:

```text
data/
uploads/avatars/
```

Không đặt các thư mục này trên filesystem tạm thời của container/serverless platform.

## Backup

Cách an toàn, đơn giản nhất là dừng ứng dụng rồi sao chép toàn bộ database và avatar:

```powershell
# Dừng process ứng dụng trước khi sao chép
New-Item -ItemType Directory -Force -Path backup | Out-Null
Copy-Item -Recurse -LiteralPath data -Destination "backup/data-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item -Recurse -LiteralPath uploads/avatars -Destination "backup/avatars-$(Get-Date -Format yyyyMMdd-HHmmss)"
```

Do SQLite sử dụng WAL, không chỉ sao chép riêng `wishes.db` trong khi server đang ghi. Nếu cần backup nóng, dùng SQLite backup API hoặc snapshot volume.

## Khôi phục

1. Dừng ứng dụng.
2. Thay thư mục `data` bằng bản backup.
3. Khôi phục `uploads/avatars` tương ứng.
4. Khởi động lại và gọi `GET /api/health`.
5. Kiểm tra `/admin`, một thiệp cá nhân và một avatar upload.

## Health check

```text
GET /api/health
```

Kỳ vọng HTTP `200` với `{ "status": "ok" }`.

## Reverse proxy

Reverse proxy cần:

- Chuyển tiếp `Host`, `X-Forwarded-For` và protocol.
- Cho phép request body tối thiểu 5 MB để upload avatar.
- Cho phép byte-range cho `nhac-nen.mp3`.
- Thiết lập HTTPS và redirect HTTP sang HTTPS.

Hiện ứng dụng chưa bật Express `trust proxy`. Trước khi dùng rate limit sau Nginx, Cloudflare hoặc proxy tương tự, cần cấu hình `app.set('trust proxy', ...)` đúng với số lớp proxy tin cậy; không đặt tùy tiện thành `true` trên Internet.

## Checklist trước khi public

- Tạo admin bằng mật khẩu mạnh và lưu trong password manager.
- Không công khai setup URL/token.
- Dùng HTTPS và `NODE_ENV=production`.
- Xác nhận `data` và `uploads/avatars` có persistent storage.
- Thiết lập backup định kỳ và thử restore.
- Kiểm tra URL sự kiện, thời gian và nội dung thiệp.
- Kiểm tra responsive, avatar, RSVP, lời chúc và nhạc trên Chrome/Safari mobile.
- Theo dõi dung lượng database, avatar và log lỗi.
