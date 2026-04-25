# Thông tin Cổng chạy (Ports Information)

Hệ thống SecureChat đang sử dụng các cổng (ports) sau để hoạt động:

1. **Frontend (React/Vite)**
   - **Cổng:** `6060`
   - **Vai trò:** Chạy giao diện người dùng (UI) bằng Vite.
   - **Cấu hình:** Được thiết lập trong lệnh start của `package.json` (`vite --port=6060 --host=0.0.0.0`).

2. **Client API Service (REST API backend)**
   - **Cổng:** `5001`
   - **Vai trò:** Cung cấp RESTful API cho Frontend gọi đến. Đóng vai trò làm Client IBE để thực hiện việc mã hoá.
   - **Cấu hình:** Được thiết lập làm `BASE_URL` trong `src/api.js` (`http://localhost:5001`).

3. **TCP Chat Server (Giao tiếp Server)**
   - **Cổng:** `5000` (Mặc định)
   - **Vai trò:** Cổng mặc định để Client API giao tiếp với TCP Server chính (quản lý IBE, luồng tin nhắn).
   - **Cấu hình:** Là port mặc định trong form kết nối hiển thị ở Frontend (`src/App.jsx`).
