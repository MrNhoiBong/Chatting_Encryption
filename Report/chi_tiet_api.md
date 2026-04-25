# Chi tiết API Server và API Client

Hệ thống được chia thành hai thành phần chính: **API Server** đóng vai trò xử lý lõi qua giao thức mạng cấp thấp, và **API Client** đóng vai trò làm trung gian (middleware) xử lý mã hóa và cung cấp REST API cho Frontend.

---

## 1. API Server (IBE TCP Socket Server)

API Server hoạt động dưới dạng một máy chủ **Raw TCP Sockets** (thường chạy tại cổng `5000`) thay vì dùng giao thức HTTP RESTful truyền thống. Điều này giúp duy trì đường truyền liên tục (Real-time).

**Nhiệm vụ chính:**
- Hoạt động như một Private Key Generator (PKG) trong hệ thống mã hóa IBE (Identity-Based Encryption).
- Tiếp nhận và định tuyến (relay) các gói tin nhắn bị mã hóa đến đúng người nhận.
- **Đặc điểm:** Hoàn toàn không lưu trữ lại (No-store) bất kỳ tin nhắn nào trong RAM hay Database nhằm đảm bảo tính bảo mật.

### Quy cách trao đổi dữ liệu (Payload JSON qua Socket)

- **Đăng ký (Register):** 
  - Gửi: `{"type": "register", "username": "tên_người_dùng"}`
  - Trả về: Trạng thái thành công kèm theo Master Public Key (MPK), Secret Key (SK) cho định danh đó và danh sách các user online.
- **Giao tiếp tin nhắn (Message Relay):**
  - Gửi: Gói tin chứa `{"type": "message", "receiver": "tên", ...}`, nội dung tin nhắn (mã hóa AES) và khóa AES (được mã hóa IBE).
  - Hoạt động: Server tìm đúng Socket của người nhận và đẩy (push) nguyên vẹn gói tin tới đó. Nếu người nhận offline, server trả về thông báo lỗi dạng `{"type": "system", ...}`.
- **Cập nhật User:** Hỗ trợ lệnh `request_users` để broadcast danh sách người dùng đang online về cho các client.

---

## 2. API Client (Flask RESTful API)

API Client là một ứng dụng Web API (thường chạy tại cổng `5001` sử dụng Flask). 
**Nhiệm vụ chính:** Làm cầu nối giao tiếp giữa giao diện người dùng (Frontend - như ReactJS) và API Server (TCP Socket). Mọi thao tác tính toán mật mã phức tạp (IBE, AES) đều diễn ra tại đây để giảm tải và cô lập sự phức tạp cho Frontend.

### Các HTTP Endpoints chính được cung cấp cho Frontend

#### `[POST] /connect`
- **Mô tả:** Khởi tạo kết nối. API Client sẽ mở một Socket TCP kết nối lên API Server và gửi gói tin đăng ký (Register). Đồng thời, sinh ra một luồng ngầm (background thread) để liên tục lắng nghe dữ liệu bị đẩy về từ Server Socket.
- **Body JSON:** `{"username": "Alice", "server_ip": "127.0.0.1", "server_port": 5000}`

#### `[POST] /send`
- **Mô tả:** Gửi tin nhắn. API Client nhận plain-text từ Frontend, sau đó:
  1. Sinh khóa phiên ngẫu nhiên (AES Session Key) và mã hóa nội dung tin nhắn.
  2. Dùng định danh của người nhận (Public Key trong IBE) để mã hóa cái khóa AES kia.
  3. Đóng gói tất cả thành JSON và đẩy qua đường ống TCP lên API Server.
- **Body JSON:** `{"target": "Bob", "message": "Nội dung cần gửi"}`

#### `[GET] /messages`
- **Mô tả:** Truy xuất tin nhắn mới. Các tin nhắn đẩy từ TCP Server về sẽ được luồng ngầm của API Client giải mã (dùng Secret Key IBE) và lưu vào một bộ đệm tạm thời (Local Array). Frontend sẽ gọi endpoint này theo chu kỳ (Polling) để lấy tin nhắn. Lấy xong, dữ liệu trên bộ đệm lập tức bị xóa đi.

#### `[GET] /users`
- **Mô tả:** Trả về danh sách các user đang hoạt động trong mạng lưới hiện tại. Mảng user này được cập nhật theo thời gian thực mỗi khi API Client nhận được thông điệp `user_list` từ TCP Server.
