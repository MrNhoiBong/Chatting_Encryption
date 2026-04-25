# Chi tiết kỹ thuật

## Ngôn ngữ và thư viện sử dụng
- **Ngôn ngữ**: Python.
- **Thư viện chính**:
  - `socket`: Được sử dụng để thiết lập các kết nối mạng TCP/IP ở mức thấp.
  - `threading`: Hỗ trợ lập trình đa luồng (multi-threading) giúp quản lý nhiều client đồng thời.
  - (Và các module chuẩn khác của Python tùy thuộc vào yêu cầu bổ sung như `json` để phân tích dữ liệu).

## Cấu trúc mã nguồn
- `server.py` / `server_impl.py`: Chứa mã nguồn khởi tạo server, lắng nghe kết nối đến ở cổng (port) chỉ định, và logic broadcast tin nhắn.
- `client.py` / `client_impl.py`: Chứa mã nguồn khởi tạo kết nối của người dùng tới server, thiết lập giao diện (nếu có) và xử lý luồng nhận/gửi tin.
- **Thư mục tài liệu**: Chứa các file tài liệu hướng dẫn và thiết kế (như thư mục `Report`, `Note`).

## Các giao thức hoặc cơ chế truyền dữ liệu
- **Giao thức mạng**: Sử dụng bộ giao thức **TCP/IP** để đảm bảo dữ liệu truyền tải đáng tin cậy, không bị mất mát và đúng thứ tự.
- **Cơ chế truyền dữ liệu**:
  - Bản tin (payload) thường được tuần tự hóa (ví dụ: dùng định dạng JSON) hoặc gửi dưới dạng chuỗi byte (`.encode('utf-8')`).
  - Sử dụng các ký tự phân cách (như `\n`) hoặc header chỉ định độ dài tin nhắn để giải quyết vấn đề nhận dính gói tin (TCP stream).
