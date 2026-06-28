# Goportal

Goportal là một nền tảng tích hợp toàn diện dành riêng cho cộng đồng game thủ, kết hợp giữa mạng xã hội giao tiếp thời gian thực (tin nhắn, thoại, video) và hệ sinh thái đăng tải, trải nghiệm game, cùng bộ công cụ tổ chức giải đấu.

Dự án được xây dựng với **Go** (Backend), **React/TypeScript/Electron** (Frontend), và sử dụng **LiveKit** làm máy chủ truyền thông đa phương tiện.

## Yêu cầu hệ thống (Prerequisites)

Trước khi chạy dự án, hãy đảm bảo bạn đã cài đặt sẵn các công cụ sau:
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Go](https://go.dev/) (Phiên bản 1.20 trở lên)
- [Node.js](https://nodejs.org/) (Phiên bản 18 trở lên) & npm

---

## Hướng dẫn cài đặt và chạy dự án

### 1. Khởi chạy các dịch vụ hạ tầng (Docker)

Hệ thống yêu cầu các dịch vụ như MySQL, Redis, LiveKit và LiveKit Egress để hoạt động.

Mở terminal ở thư mục gốc của dự án (`goportal`) và chạy lệnh sau:

```bash
docker-compose up -d
```

Lệnh này sẽ khởi tạo các container:
- **MySQL 8.4** (Port: `3306`, Database: `goportal-db`)
- **Redis 7** (Port: `6379`)
- **LiveKit Server** (Port: `7880`, `7881`, `50100-50200/udp`)
- **LiveKit Egress** (Hỗ trợ ghi hình/livestream)

*Lưu ý: Hãy đợi vài giây để MySQL và Redis chuyển sang trạng thái "healthy" trước khi chạy Backend.*

### 2. Chạy Backend (Go)

Backend cung cấp RESTful API và hệ thống WebSocket cho ứng dụng.

Mở một tab terminal mới và chạy:

```bash
cd backend

# Cải đặt các thư viện phụ thuộc
go mod tidy

# Khởi chạy backend (kèm cờ -migrate để tự động tạo bảng DB và -seed để tạo dữ liệu mẫu)
go run . -config configs/config.yaml -migrate -seed
```

Backend sẽ khởi chạy thành công và lắng nghe tại địa chỉ `http://localhost:8080`.

### 3. Chạy Frontend bản Web (React + Vite)

Frontend cung cấp giao diện người dùng chính của nền tảng.

Mở một tab terminal mới và chạy:

```bash
cd frontend

# Cài đặt các gói thư viện Node.js
npm install

# Khởi chạy môi trường phát triển cho Web
npm run dev:web
```

Sau khi chạy xong, bạn có thể truy cập ứng dụng trên trình duyệt web qua đường dẫn `http://localhost:5173` (hoặc cổng mà Vite thông báo trên terminal).

### 4. Chạy ứng dụng Desktop (Electron)

Nếu bạn muốn trải nghiệm nền tảng dưới dạng ứng dụng Desktop thay vì chạy trên trình duyệt web:

```bash
cd frontend

# Đảm bảo đã chạy npm install ở bước trước
# Khởi chạy bản Desktop (Electron)
npm run dev:desktop
```

---

## Khắc phục sự cố thường gặp (Troubleshooting)

- **Lỗi kết nối MySQL (`Connection Refused`)**: Đảm bảo rằng container `goportal-mysql` đã khởi động hoàn toàn. Chạy `docker ps` để kiểm tra trạng thái sức khỏe (health status) của container.
- **Lỗi kết nối LiveKit**: Kiểm tra kỹ cấu hình IP cục bộ trong file `livekit.yaml` và `egress.yaml` nếu bạn sử dụng mạng ngoài localhost.
- **Lỗi thiếu gói NPM hoặc Go module**: 
  - Ở Frontend: Hãy thử xóa thư mục `node_modules` và chạy lại `npm install`.
  - Ở Backend: Chạy lệnh `go clean -modcache` rồi `go mod tidy` lại.