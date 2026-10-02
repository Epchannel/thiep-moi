# API

Base URL khi phát triển: `http://localhost:3000`.

API công khai nhận và trả JSON. Các route admin dùng form HTML, session cookie và CSRF token, không phải public API.

## Health check

```http
GET /api/health
```

Phản hồi:

```json
{ "status": "ok" }
```

## Lấy tường lời chúc

```http
GET /api/wishes?limit=50&offset=0
```

| Query | Mặc định | Giới hạn |
|---|---:|---:|
| `limit` | 50 | 1–100 |
| `offset` | 0 | Từ 0 |

Chỉ trả lời chúc có trạng thái `approved`.

```json
{
  "wishes": [
    {
      "id": 1,
      "guestName": "Nguyễn Văn A",
      "message": "Chúc mừng tốt nghiệp!",
      "guestId": null,
      "createdAt": "2026-09-30T10:00:00.000Z"
    }
  ]
}
```

## Gửi lời chúc từ trang chủ

```http
POST /api/wishes
Content-Type: application/json
```

```json
{
  "guestName": "Nguyễn Văn A",
  "message": "Chúc mừng tốt nghiệp!"
}
```

Quy tắc:

- `guestName`: bắt buộc, tối đa 80 ký tự.
- `message`: bắt buộc, tối đa 1.000 ký tự.
- Thành công trả HTTP `201`.
- Giới hạn 10 lần gửi/IP/15 phút.

## Gửi RSVP từ thiệp riêng

```http
POST /api/invitations/:slug/respond
Content-Type: application/json
```

```json
{
  "attendanceStatus": "attending",
  "partySize": 2,
  "message": "Hẹn gặp em trong ngày tốt nghiệp!"
}
```

`attendanceStatus` nhận `attending` hoặc `declined`. `partySize` giới hạn 1–20 và được đặt về 1 khi khách từ chối. `message` không bắt buộc, tối đa 1.000 ký tự.

Phản hồi thành công:

```json
{ "message": "Phản hồi của bạn đã được lưu. Cảm ơn bạn!" }
```

## Mã lỗi thường gặp

| HTTP | Ý nghĩa |
|---:|---|
| 400 | Payload hoặc trạng thái không hợp lệ |
| 401 | Sai thông tin đăng nhập admin |
| 403 | CSRF/session hoặc setup token không hợp lệ |
| 404 | Không tìm thấy API, khách hoặc thiệp đã bị ẩn |
| 429 | Vượt rate limit |
| 500 | Lỗi nội bộ server |

