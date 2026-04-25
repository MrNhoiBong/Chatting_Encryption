# Client Container

Thư mục này chứa code và cấu hình Docker để chạy Client (bao gồm cả Frontend giao diện web và Backend API xử lý mã hóa IBE).

## Cách sử dụng Docker

### 1. Build Docker Image
Mở terminal tại thư mục `ClientContainer` và chạy lệnh sau để build image:
```bash
docker build -t ibe-chat-client .
```
Quá trình build có thể mất một chút thời gian vì nó cần cài đặt thư viện PBC và Charm-crypto từ source code, cũng như cài đặt Node.js và các package của frontend/backend.

### 2. Run Docker Container
Sau khi build xong, bạn chạy container bằng lệnh sau:
```bash
docker run -d -p 6060:6060 -p 5001:5001 --name ibe-client-1 ibe-chat-client
```
Giải thích:
- `-p 6060:6060`: Mở port 6060 để bạn có thể truy cập giao diện Frontend từ trình duyệt.
- `-p 5001:5001`: Mở port 5001 cho Backend API (Frontend sẽ gọi các API tới port này).
- `-d`: Chạy container ở chế độ background (detached).

### 3. Sử dụng Ứng dụng
Sau khi container khởi động thành công, mở trình duyệt và truy cập:
[http://localhost:6060](http://localhost:6060)

Tại đây, bạn sẽ thấy giao diện web của ứng dụng chat. Bạn có thể tiến hành kết nối đến Server (ServerContainer phải đang chạy trước). Mặc định nếu chạy ServerContainer trên cùng máy host, IP của server sẽ là `host.docker.internal` và port `5000`.

### 4. Xem logs hoặc Dừng Container
- Để xem logs (nếu cần debug lỗi):
```bash
docker logs ibe-client-1
```
- Để dừng container:
```bash
docker stop ibe-client-1
```
- Để xóa container (nếu muốn tạo lại):
```bash
docker rm ibe-client-1
```
