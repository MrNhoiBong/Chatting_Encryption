# Các APIs Tích Hợp (Integration APIs)

Các APIs được định nghĩa trong file `src/api.js` và sẽ trỏ về REST API của Client Service ở địa chỉ `http://localhost:5001`.

1. **`POST /connect`** (Được gọi qua hàm `chatApi.connect`)
   - **Chức năng:** Khởi tạo kết nối từ người dùng hiện tại lên TCP Server thông qua API Client.
   - **Body Data (JSON):**
     ```json
     {
       "server_ip": "host.docker.internal",
       "server_port": 5000,
       "username": "tên_người_dùng"
     }
     ```

2. **`GET /users`** (Được gọi qua hàm `chatApi.getUsers`)
   - **Chức năng:** Lấy danh sách toàn bộ các người dùng (nodes) đang hoạt động (online) trên hệ thống.
   - **Dữ liệu trả về:** JSON object chứa mảng các tên username `{"users": ["user1", "user2"]}`.

3. **`POST /send`** (Được gọi qua hàm `chatApi.sendMessage`)
   - **Chức năng:** Gửi tin nhắn được mã hoá đến một người dùng cụ thể.
   - **Body Data (JSON):**
     ```json
     {
       "target": "tên_người_nhận",
       "message": "nội_dung_tin_nhắn"
     }
     ```

4. **`GET /messages`** (Được gọi qua hàm `chatApi.getMessages`)
   - **Chức năng:** Lấy danh sách các tin nhắn mới được gửi đến cho user đang đăng nhập. Được Frontend gọi liên tục mỗi 2 giây.
   - **Dữ liệu trả về:** JSON object chứa mảng các thông báo tin nhắn mới.
