# Kiến trúc và dữ liệu

## Tổng quan

Ứng dụng chạy trên một tiến trình Node.js:

```text
Browser
  ├── Trang chủ tĩnh (HTML/CSS/JS)
  ├── Thiệp cá nhân (EJS render phía server)
  └── Admin (EJS + form HTML)
          │
       Express
          │
       SQLite
```

Express phục vụ file tĩnh, API JSON, route admin và route thiệp `/:slug`. Các file nhạy cảm như database, mã server, views, package metadata và `node_modules` bị chặn khỏi static hosting.

## Thành phần

- `server.js`: khởi tạo Express, middleware, API và routes.
- `server/database.js`: tạo/migrate schema và toàn bộ truy vấn.
- `server/auth.js`: scrypt, opaque session token, cookie và CSRF.
- `server/validation.js`: chuẩn hóa dữ liệu và slug tiếng Việt.
- `views/invitation.ejs`: render dữ liệu khách, thiệp 3D mở phong bì và Open Graph metadata.
- `views/admin`: giao diện quản trị.
- `index.html`: trang chủ với lớp nền Vector Khu A HUMG phát sáng neon gold và modal 3D Mở Thiệp.
- `main.js`: tương tác trang chủ, particle engine, hiệu ứng nghiêng 3D Tilt & mở phong bì 3D Unboxing.
- `background-music.js`: logic audio dùng chung.

## Hiệu ứng Giao diện & Trải nghiệm (UI/UX)

- **Lớp nền Vector Khu A HUMG (`#school-vector-bg`)**: Lớp hình họa vector trường Đại học Mỏ - Địa Chất cố định ở góc dưới với hiệu ứng viền phát sáng Neon Gold nhẹ nhàng, hòa tan mềm mại vào nền tối.
- **Trải nghiệm 3D Royal Unboxing Envelope**:
  - Modal mở thiệp với phong bì 3D nghiêng theo con trỏ chuột (3D Parallax Tilt).
  - Con dấu sáp vàng khắc logo HUMG tích hợp vành đai xoay 360 độ và dải ruy-băng satin.
  - Hiệu ứng mở thiệp 3 giai đoạn: Lật nắp tam giác 180° và mờ dần (tránh che chữ), rút thiệp mời dát vàng vươn lên vị trí trung tâm chuẩn tỉ lệ, bùng nổ hào quang Shockwave và pháo hoa Confetti 3 đợt.

## Database

File mặc định: `data/wishes.db`. SQLite chạy WAL mode và bật foreign keys.

### `admins`

Lưu username và mật khẩu đã băm bằng scrypt. Không lưu mật khẩu thuần.

### `admin_sessions`

Lưu hash của session token, admin sở hữu session, CSRF token và thời hạn. Cookie phía trình duyệt có `HttpOnly`, `SameSite=Lax`; production bổ sung `Secure`.

### `guests`

Các nhóm trường chính:

- Danh tính: `full_name`, `salutation`, `relationship`.
- Thiệp: `slug`, `avatar_url`, `personal_message`, `status`.
- Nội bộ: `phone`, `note`.
- RSVP: `attendance_status`, `party_size`, `responded_at`.
- Theo dõi: `view_count`, `first_viewed_at`, `last_viewed_at`.
- Audit thời gian: `created_at`, `updated_at`.

`attendance_status` nhận `unconfirmed`, `attending`, `declined`. `status` nhận `active`, `hidden`.

### `wishes`

Lưu người gửi, nội dung, trạng thái và `guest_id` tùy chọn. Khi xóa khách, lời chúc được giữ lại và `guest_id` chuyển thành `NULL`.

### `app_metadata`

Lưu trạng thái migration/seed nội bộ để dữ liệu mẫu không bị tạo lại sau khi admin xóa hết lời chúc.

## Luồng thiệp cá nhân

1. Request `GET /:slug` tìm khách đang hoạt động.
2. Server tăng lượt xem và render EJS.
3. Khách gửi RSVP tới `/api/invitations/:slug/respond`.
4. Database cập nhật RSVP trong transaction.
5. Nếu có lời chúc, hệ thống tạo bản ghi `wishes` liên kết `guest_id`.

## Bảo mật hiện tại

- Helmet và Content Security Policy.
- Password hashing bằng scrypt với salt riêng.
- Session token ngẫu nhiên chỉ lưu dạng hash trong database.
- CSRF token cho mọi thao tác thay đổi dữ liệu admin.
- Rate limit cho login, RSVP và gửi lời chúc.
- Validation độ dài, URL, trạng thái và reserved slug.
- Upload chỉ nhận JPEG, PNG, WebP và giới hạn 5 MB.
- Cache admin bị tắt bằng `Cache-Control: no-store`.

## Giới hạn kiến trúc

- Chưa có phân quyền nhiều vai trò admin.
- Chưa có giao diện đổi/khôi phục mật khẩu.
- Chưa có pagination phía admin.
- Avatar và SQLite nằm trên filesystem local, nên cần persistent volume khi deploy.
- Theo dõi lượt xem tính theo mỗi page load, chưa loại bot hoặc lượt reload.

