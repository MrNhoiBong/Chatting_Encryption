# Các Functions Chính (Main Functions)

Các functions chính xử lý logic hoạt động của giao diện nằm trong file `src/App.jsx`:

1. **`scrollToBottom()`**
   - **Chức năng:** Tự động cuộn khung chat xuống phần tử cuối cùng để luôn hiển thị nội dung tin nhắn mới nhất.

2. **`poll()`** (Được gọi bên trong `useEffect`)
   - **Chức năng:** Thực hiện cơ chế long-polling chạy lặp lại mỗi `2000ms`.
   - **Hoạt động:** Gọi API `getUsers()` để cập nhật danh sách các node đang online vào state `onlineUsers`, đồng thời gọi API `getMessages()` để cập nhật các tin nhắn mới nhận được vào state `messages`.

3. **`handleConnect(e)`**
   - **Chức năng:** Xử lý sự kiện khi người dùng ấn nút "ESTABLISH CONNECTION" (đăng nhập/kết nối).
   - **Hoạt động:** Ngăn form reload, lấy các giá trị `username`, `ip`, `port` từ form. Gọi API `chatApi.connect` để xác thực với Client API Service. Nếu thành công, cập nhật state `currentUser` và `connectionInfo` để chuyển sang giao diện chat.

4. **`handleSendMessage(e)`**
   - **Chức năng:** Xử lý sự kiện khi người dùng submit khung nhập tin nhắn trong phòng chat.
   - **Hoạt động:** Lấy nội dung tin nhắn, gọi API `chatApi.sendMessage` với người nhận (`selectedUser`) và nội dung (`newMessage`). Sau đó tự động append tin nhắn vừa gửi vào state danh sách tin nhắn hiện tại để hiển thị lên UI ngay lập tức nhằm tăng trải nghiệm người dùng.
