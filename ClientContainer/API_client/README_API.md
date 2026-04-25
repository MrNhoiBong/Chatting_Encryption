# Frontend/Client API Reference

Tài liệu này cung cấp chi tiết về **Client API Mid-Tier Endpoints**. Đây là hệ thống "cầu nối" Local, thiết kế theo chuẩn Restful API dành cho UI Frontend (React, Mobile App). Tuy nhiên, bên dưới lớp vỏ HTTP này là một hệ thống **Worker TCP Socket** kết nối liên tục (24/7) lên Server Lõi.

Toàn bộ các gói tin bị mã hóa do hệ thống chuyển phát nhanh TCP Server đẩy về sẽ được tự động giải phóng bởi thuật toán bảo mật IBE/AES và **lưu thẳng vào RAM của máy bạn** (Biến `local_messages_db`).

---

## Base URL
Chạy ở cổng dịch vụ local:
`http://localhost:5001` (Cổng của Flask)

---

## 1. Mở Cầu Nối Cục Bộ
Giao thức gửi mở TCP Session Stream với PKG Center gốc, thực hiện lấy Key giải mã riêng. Frontend gọi lệnh này khi người dùng nhấn "Login".
- **HTTP Method:** `POST`
- **Endpoint:** `/connect`

### Request Body (JSON)
| Trường dữ liệu | Bắt buộc | Mô tả |
| :--- | :---: | :--- |
| `username` | Có | Định danh IBE hiển thị. |
| `server_ip` | Không | Địa chỉ IP Server (mặc định: 127.0.0.1) |
| `server_port` | Không | Cổng Socket TCP Server (mặc định: 5000) |

---

## 2. Truy xuất trạng thái trực tuyến
Trạng thái này được **Thread Worker Cập nhật tự động**. Việc Frontend gọi list ra rất nhanh do không cần chờ request mạng Server mà lấy dữ liệu có sẵn.
- **HTTP Method:** `GET`
- **Endpoint:** `/users`

---

## 3. Quăng tin lên Mạng bằng Socket Liên Hợp
Nhận tin văn bản tự nhiên, dùng khối RSA-variant ngầm để tự khóa lại thành chuỗi ma trận SS512, dùng Socket TCP Stream đang duy trì đẩy thẳng vào màng Server.
- **HTTP Method:** `POST`
- **Endpoint:** `/send`

### Request Body (JSON)
| Trường dữ liệu | Bắt buộc | Mô tả |
| :--- | :---: | :--- |
| `target` | Có | Bạn trên mạng. |
| `message` | Có | Text thông điệp rõ ("Xin chào") |

---

## 4. Xóa/Đọc Hộp Thư RAM Cục bộ (Polling Box)
API Client do giải mã ngầm rất nhiều khối, nên mảng Message sẽ bị phình to. Khi Frontend chạy gọi Pull dữ liệu này, nó sẽ nhận về bản trong suốt và Backend local sẽ **Clear rỗng luôn mảng lưu trữ**. Do độ trễ chỉ bằng localhost (0.1ms), hàm này có thể chạy Polling (cứ sau 0.5s gọi).
- **HTTP Method:** `GET`
- **Endpoint:** `/messages`

### Response mẫu (200 OK)
```json
{
  "messages": [
    {
      "sender": "Bob",
      "message": "Nội dung Text sạch số 1"
    }
  ]
}
```
