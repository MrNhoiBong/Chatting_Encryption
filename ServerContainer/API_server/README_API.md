# Server TCP/Socket Reference

Tài liệu này mô tả cấu trúc giao tiếp mạng trực tiếp đối với hệ thống lõi **IBE Socket Server**. 
Theo kiến trúc Real-time, Server không sử dụng giao thức HTTP tĩnh (REST) mà sử dụng giao thức **Raw TCP Sockets** để duy trì đường truyền liên tục. Trách nhiệm của Server là khởi tạo vùng IBE chuẩn, tạo Private Key Generator (PKG) và tiếp nhận – chuyển hướng các tin nhắn bị xáo trộn. Cốt lõi của nó là **KHÔNG LƯU GIỮ** bất kì tin nhắn nào trên RAM máy chủ.

---

## Endpoint / Cổng kết nối
Lắng nghe giao thức IP Socket (TCP) tại cổng:
`localhost:5000`

---

## Quy cách gói tin (Payload JSON) gửi qua Socket

Khi kết nối với Server qua lệnh `socket.connect`, các thiết bị đẩy chuỗi JSON thô (tự Serialize string) và kết thúc.

### 1. Packet Đăng ký ID & Yêu cầu MPK/SK
```json
// Gửi đi:
{
  "type": "register",
  "username": "Alice"
}

// Server văng về lại Socket:
{
  "status": "success",
  "mpk": "xyz1...",
  "sk": "abc2...",
  "users": ["Alice"]
}
```

### 2. Packet Giao tin nhắn IBE
Nếu Alice gửi tới Bob, Server sẽ kiểm tra trên mảng con trỏ Socket của mình. Nếu Bob đang nối tới mạng, Server quăng đoạn thông điệp về thẳng đường hầm của Bob. Ngược lại, báo sai lệch.
```json
// Gửi đi:
{
  "type": "message",
  "receiver": "Bob",
  "aes_nonce": "...",
  "aes_ciphertext": "...",
  "aes_tag": "...",
  "ibe_enc_key": { ... }
}

// Nếu Bob Không Online, nhận lại:
{
  "type": "system",
  "content": "Chuyển tiếp thất bại: Người dùng 'Bob' không online."
}
```

### 3. Packet Xin Request List Users
Để đồng bộ danh sách
```json
// Gửi đi:
{
  "type": "request_users"
}

// Server văng về:
{
  "type": "user_list",
  "users": ["Alice", "Bob"]
}
```
