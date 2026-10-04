# Hướng dẫn quản trị

## Tạo admin đầu tiên

Khi database chưa có admin, server tạo một setup token và in link vào terminal:

```text
Create the first admin at http://localhost:3000/admin/setup?token=...
```

Mở link, nhập tên đăng nhập và mật khẩu tối thiểu 10 ký tự. Không có tài khoản hoặc mật khẩu mặc định.

Nếu server được restart trước khi hoàn tất setup, dùng link mới nhất trong terminal. Có thể cố định token setup bằng biến môi trường `ADMIN_SETUP_TOKEN`.

## Đường dẫn quản trị

| Đường dẫn | Chức năng |
|---|---|
| `/admin/login` | Đăng nhập |
| `/admin` | Dashboard tổng quan |
| `/admin/guests` | Danh sách khách mời |
| `/admin/guests/new` | Tạo khách mời |
| `/admin/guests/:id/edit` | Sửa khách mời |
| `/admin/wishes` | Quản lý lời chúc |

## Tạo khách mời

Các trường quan trọng:

- **Họ và tên:** tên hiển thị của khách.
- **Cách xưng hô:** Cô, Thầy, Anh, Chị…
- **Quan hệ:** giảng viên, gia đình, bạn bè…
- **Slug:** phần đường dẫn riêng, ví dụ `nong-thi-oanh`.
- **Lời nhắn riêng:** nội dung xuất hiện trên đầu thiệp.
- **Trạng thái:** `Hoạt động` cho phép truy cập; `Ẩn` trả về trang không tìm thấy.
- **RSVP và số người:** admin có thể điều chỉnh thủ công khi cần.
- **Ghi chú nội bộ:** chỉ admin nhìn thấy.

Slug được sinh tự động từ tên và phải là duy nhất. Các slug hệ thống như `admin`, `api`, `server`, `data`, `login` không được sử dụng.

Sau khi tạo, nhấn **Sao chép** trong danh sách khách để lấy link đầy đủ.

## Avatar

Có hai cách nhập avatar:

1. Upload JPG, PNG hoặc WebP, tối đa 5 MB.
2. Nhập URL ảnh công khai, tối đa 2.048 ký tự.

Upload được khuyến nghị vì ảnh được lưu tại `uploads/avatars` và không phụ thuộc dịch vụ ngoài.

URL Facebook CDN có thể hoạt động tại thời điểm nhập nhưng thường chứa chữ ký và ngày hết hạn. Không cắt bớt query string; đặc biệt phải giữ đầy đủ `oh` và `oe`. Khi URL hết hạn, mở khách mời để cập nhật link mới hoặc upload ảnh lên server.

Khi thay hoặc xóa avatar upload, file cũ được dọn tự động. Nếu URL ngoài lỗi, trang thiệp sử dụng ảnh mặc định.

## RSVP và lượt xem

Mỗi lần trang thiệp được tải thành công, `view_count` tăng một và hệ thống cập nhật lần xem đầu/cuối.

Khách có thể chọn:

- Sẽ tham dự và nhập số người từ 1–20.
- Không thể tham dự.
- Gửi thêm lời chúc tối đa 1.000 ký tự.

Phản hồi mới cập nhật trực tiếp trạng thái của khách. Nếu khách gửi lời chúc, lời chúc được liên kết với khách đó.

## Quản lý lời chúc

Trang `/admin/wishes` hỗ trợ tìm kiếm và lọc theo:

- `approved`: hiển thị trên tường lời chúc.
- `pending`: chờ duyệt.
- `rejected`: bị từ chối và không hiển thị công khai.

Admin có thể thay đổi trạng thái hoặc xóa vĩnh viễn. Hiện tại lời chúc mới từ trang chủ và thiệp cá nhân được duyệt ngay (`approved`).

## Nhạc nền

Cả trang chủ và thiệp cá nhân dùng `/nhac-nen.mp3`, phát lặp với âm lượng 50%. Nút SVG trên thanh điều hướng cho phép bật/tắt.

Chrome, Safari và các trình duyệt di động có thể chặn autoplay có âm thanh. Khi đó hệ thống phát nhạc ở lần click, chạm hoặc nhấn phím đầu tiên. Đây là chính sách của trình duyệt, không phải lỗi server.

