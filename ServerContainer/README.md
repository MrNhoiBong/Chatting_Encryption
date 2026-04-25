# Server Container

Thư mục này chứa code và cấu hình Docker để chạy Server trung tâm. Server đóng vai trò là Private Key Generator (PKG) cấp phát khóa cho giao thức IBE, đồng thời là trạm trung chuyển (relay) các tin nhắn giữa các Client với nhau.

## Cách sử dụng Docker

### 1. Build Docker Image
Mở terminal tại thư mục `ServerContainer` và chạy lệnh sau để build image:
```bash
docker build -t ibe-chat-server .
```
Quá trình build có thể mất một chút thời gian do cài đặt các thư viện mã hóa lõi như PBC và Charm-crypto từ source code.

### 2. Run Docker Container
Sau khi build xong, khởi động server container bằng lệnh sau:
```bash
docker run -d -p 5000:5000 --name ibe-server-1 ibe-chat-server
```
Giải thích:
- `-p 5000:5000`: Mở port 5000, là port giao tiếp qua TCP Socket của server. Các client sẽ kết nối tới port này.
- `-d`: Chạy container ở chế độ background (detached).

### 3. Xem logs hoặc Dừng Container
Vì Server chạy ngầm, bạn có thể xem các log kết nối của Client thông qua lệnh:
```bash
docker logs -f ibe-server-1
```
*(Thêm `-f` để theo dõi logs theo thời gian thực)*

- Để dừng container:
```bash
docker stop ibe-server-1
```
- Để xóa container (nếu muốn tạo lại):
```bash
docker rm ibe-server-1
```

### Lưu ý
Hãy đảm bảo ServerContainer được khởi chạy và đang hoạt động (trên port 5000) **TRƯỚC KHI** Client cố gắng kết nối.
