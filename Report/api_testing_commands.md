# Hướng dẫn kiểm thử API qua Terminal (cURL)

File này chứa danh sách các lệnh `curl` dùng để tương tác trực tiếp với Client API Backend (chạy ở cổng 5001) thông qua Terminal/Ubuntu mà không cần sử dụng giao diện (Frontend). Bạn có thể dùng 2 Terminal khác nhau gọi tới 2 Client API (nếu bạn chạy nhiều client ở các cổng khác nhau, ví dụ 5001 và 5002) để mô phỏng 2 người dùng nhắn tin với nhau.

**Lưu ý:** Chắc chắn rằng Server đang chạy ở cổng 5000 và Client API đang chạy ở cổng 5001. Thay đổi cổng nếu bạn chạy nhiều Client (VD: đổi `5001` thành `5002` cho user thứ hai).

---

### 1. Đăng nhập / Kết nối với Server (Connect)
Lệnh này gửi thông tin của người dùng để Server đăng ký và cấp phát IBE Secret Key.
```bash
curl -X POST http://localhost:5001/connect \
     -H "Content-Type: application/json" \
     -d '{"username": "Alice", "server_ip": "host.docker.internal", "server_port": 5000}'
```

### 2. Xem danh sách người dùng đang online (Get Users)
```bash
curl -X GET http://localhost:5001/users
```

### 3. Gửi tin nhắn cá nhân (Personal Message)
Gửi tin nhắn được mã hóa bằng IBE cho người dùng có tên là "Bob".
```bash
curl -X POST http://localhost:5001/send \
     -H "Content-Type: application/json" \
     -d '{"target": "Bob", "message": "Xin chao Bob, day la tin nhan test!"}'
```

### 4. Nhận và đọc tin nhắn (Read Messages)
Lấy danh sách các tin nhắn đã được giải mã nằm trong Local Database ảo của Client. Lệnh này sẽ rút toàn bộ tin nhắn hiện có và làm rỗng hộp thư (Pop).
```bash
curl -X GET http://localhost:5001/messages
```

---

## Tính năng Group Chat

### 5. Tạo Group Chat
Yêu cầu Server tạo nhóm và tự động cấp phát khóa bí mật (Secret Key) cho nhóm.
```bash
curl -X POST http://localhost:5001/groups/create \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA"}'
```

### 6. Mời người khác vào Group Chat
Bạn chỉ có thể mời khi đã nằm trong nhóm `TeamA`.
```bash
curl -X POST http://localhost:5001/groups/invite \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA", "target_user": "Bob"}'
```

### 7. Kiểm tra trạng thái nhóm & lời mời
Lệnh này giúp bạn xem các nhóm đã tham gia và các lời mời nhóm đang chờ xác nhận (pending invitations).
```bash
curl -X GET http://localhost:5001/groups/info
```

### 8. Chấp nhận lời mời tham gia Group Chat
*(Đứng ở vai trò Bob, giả sử Bob đang chạy Client ở cổng 5002, bạn đổi 5001 thành 5002)*.
```bash
curl -X POST http://localhost:5001/groups/accept \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA"}'
```

### 9. Gửi tin nhắn vào Group Chat
Gửi một tin nhắn mã hóa chung tới cả nhóm. Bất kỳ ai trong nhóm đều có thể giải mã và đọc được.
```bash
curl -X POST http://localhost:5001/groups/send \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA", "message": "Chao ca nhom nhe!"}'
```
