# Thiết kế & Triển khai

## Kiến trúc hệ thống
- **Mô hình**: Client - Server.
- **Cách quản lý kết nối**: Server duy trì và quản lý trạng thái của nhiều kết nối socket từ các client cùng lúc để dễ dàng định tuyến tin nhắn.

## Luồng hoạt động
1. Client kết nối tới server.
2. Client gửi tin nhắn lên server.
3. Server nhận tin nhắn.
4. Server broadcast (phát đa hướng) tin nhắn đó đến các client khác đang kết nối.

## Cách xử lý đồng thời
- Sử dụng **multi-threading** (đa luồng): Khi một client mới kết nối, server sẽ tạo ra một luồng (thread) riêng biệt để xử lý việc lắng nghe tin nhắn từ client đó. Điều này giúp server xử lý đồng thời nhiều client mà không bị chặn (block).

