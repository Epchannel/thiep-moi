# Graduation Invitation

Website thư mời tốt nghiệp gồm trang chủ, thiệp cá nhân cho từng khách, RSVP, bức tường lời chúc và trang quản trị.

## Tính năng

- Trang chủ giới thiệu sự kiện, lịch trình, đếm ngược, tường lời chúc và thiệp 3D mở phong bì lộng lẫy.
- Lớp nền nghệ thuật Vector Khu A HUMG với hiệu ứng Neon Gold phát sáng nhẹ nhàng ở góc màn hình.
- Mỗi khách có một URL riêng, ví dụ `/nong-thi-oanh` với trải nghiệm thiệp 3D Royal Unboxing cá nhân hóa.
- Thiệp 3D với hiệu ứng nghiêng theo chuột (3D Tilt), con dấu sáp vàng xoay 360°, lật nắp tam giác, rút lá thư dát vàng và bắn pháo hoa Confetti.
- Thiệp cá nhân có avatar, cách xưng hô, quan hệ và lời nhắn riêng.
- Khách xác nhận tham dự, số người đi cùng và gửi lời chúc.
- Admin quản lý khách, link thiệp, lượt xem, RSVP và lời chúc.
- Avatar hỗ trợ URL ngoài hoặc upload JPG, PNG, WebP tối đa 5 MB.
- Nhạc nền `nhac-nen.mp3` phát lặp ở âm lượng 50%, có nút SVG bật/tắt.
- Dữ liệu lưu bằng SQLite; không cần cài database server riêng.

## Yêu cầu

- Node.js 20 trở lên.
- npm 10 trở lên được khuyến nghị.

## Chạy nhanh

```powershell
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Không mở trực tiếp `index.html` vì giao diện cần backend API.

Lần đầu chạy, terminal in một URL dạng:

```text
http://localhost:3000/admin/setup?token=...
```

Mở URL đó để tạo admin đầu tiên. Token hết hiệu lực sau khi tài khoản được tạo.

Các lệnh có sẵn:

```powershell
npm run dev    # Chạy và tự restart khi mã nguồn thay đổi
npm start      # Chạy thông thường
npm run check  # Kiểm tra cú pháp JavaScript
```

## Cấu trúc chính

```text
web-graduation/
├── server.js                 # Express server và routes
├── server/
│   ├── auth.js               # Mật khẩu, session và CSRF
│   ├── database.js           # Schema và truy vấn SQLite
│   └── validation.js         # Validation và sinh slug
├── views/
│   ├── admin/                # Giao diện quản trị EJS
│   ├── partials/             # Thành phần dùng chung
│   └── invitation.ejs        # Thiệp cá nhân
├── data/wishes.db            # Database runtime, không commit Git
├── uploads/avatars/          # Avatar upload, không commit Git
├── index.html                # Trang chủ
├── main.js                   # Tương tác trang chủ
├── invitation.js             # RSVP trên thiệp cá nhân
├── background-music.js       # Nhạc nền dùng chung
└── nhac-nen.mp3              # File nhạc nền
```

## Tài liệu

- [Hướng dẫn quản trị](docs/ADMIN_GUIDE.md)
- [API](docs/API.md)
- [Kiến trúc và dữ liệu](docs/ARCHITECTURE.md)
- [Triển khai và vận hành](docs/DEPLOYMENT.md)

## Lưu ý

- Trình duyệt có thể chặn autoplay có âm thanh. Hệ thống sẽ thử phát ngay, sau đó phát ở tương tác đầu tiên nếu bị chặn.
- URL ảnh Facebook CDN thường dài và có thời hạn trong tham số `oe`. Hệ thống chấp nhận URL tối đa 2.048 ký tự, nhưng upload ảnh vẫn là lựa chọn ổn định hơn.
- SQLite phù hợp khi chạy một instance. Nếu cần nhiều server đồng thời, nên chuyển sang PostgreSQL hoặc database tập trung.

