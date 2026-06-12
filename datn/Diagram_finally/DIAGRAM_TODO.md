# Checklist biểu đồ cuối cùng

File này ghi lại trạng thái các biểu đồ đang dùng trong quyển đồ án. Các ảnh trong `Diagram_finally/Usecase` đã được dùng để thay thế ảnh tự sinh ở Chương 2.

## Đã có bản Astah và đã thay vào đồ án

| Mục trong đồ án | File Astah/ảnh nguồn | Ảnh đang được LaTeX dùng |
|---|---|---|
| Use case tổng quát | `Usecase/Tổng quan.asta`, `Usecase/Tổng quan.png` | `Hinhve/Chuong2/Usecase/Tong-quan.png` |
| Use case Quản lý tài khoản | `Usecase/Quản lý tài khoản.asta`, `Usecase/Quản lý tài khoản.png` | `Hinhve/Chuong2/Usecase/Quan-ly-tai-khoan.png` |
| Use case Quản lý bạn bè | `Usecase/Quản lý bạn bè.asta`, `Usecase/Quản lý bạn bè.png` | `Hinhve/Chuong2/Usecase/Quan-ly-ban-be.png` |
| Use case Quản lý máy chủ | `Usecase/Quản lý máy chủ.asta`, `Usecase/Quan-ly-may-chu.png` | `Hinhve/Chuong2/Usecase/Quan-ly-may-chu.png` |
| Use case Quản lý tin nhắn | `Usecase/Quản lý tin nhắn.asta`, `Usecase/Quan-ly-tin-nhan.png` | `Hinhve/Chuong2/Usecase/Quan-ly-tin-nhan.png` |
| Use case Chơi game và đăng tải game | `Usecase/Đăng tải và chơi game.asta`, `Usecase/Choi-game-va-dang-tai-game.png` | `Hinhve/Chuong2/Usecase/Choi-game-va-dang-tai-game.png` |
| Use case Thiết lập và tham gia giải đấu | `Usecase/Thiết lập và tham gia.asta`, `Usecase/Thiet-lap-va-tham-gia-giai-dau.png` | `Hinhve/Chuong2/Usecase/Thiet-lap-va-tham-gia-giai-dau.png` |
| Use case Vận hành trận đấu giải đấu | `Usecase/Vận hành trận đấu giải đấu.asta`, `Usecase/Van-hanh-tran-dau-giai-dau.png` | `Hinhve/Chuong2/Usecase/Van-hanh-tran-dau-giai-dau.png` |
| Activity Quy trình máy chủ | `Usecase/Quy-trinh-may-chu.asta`, `Usecase/Quy-trinh-may-chu.png` | `Hinhve/Chuong2/Activity/Quy-trinh-may-chu.png` |
| Activity Quy trình giải đấu | `Usecase/Quy-trinh-giai-dau.asta`, `Usecase/Quy-trinh-giai-dau.png` | `Hinhve/Chuong2/Activity/Quy-trinh-giai-dau.png` |
| Activity Quy trình upload game | `Usecase/Quy-trinh-upload-game.asta`, `Usecase/Quy-trinh-upload-game.png` | `Hinhve/Chuong2/Activity/Quy-trinh-upload-game.png` |

## Đã có PlantUML để import/vẽ lại

Các bản PlantUML hiện nằm trong `docs/diagrams/plantuml-redesign`. Nhóm Chương 2 đã có đủ `.puml` cho:

- `2-1-usecase-tong-quat.puml`
- `2-2-usecase-quan-ly-tai-khoan.puml`
- `2-3-usecase-quan-ly-ban-be.puml`
- `2-4-usecase-quan-ly-may-chu.puml`
- `2-5-usecase-quan-ly-tin-nhan.puml`
- `2-6-usecase-choi-game-va-dang-tai-game.puml`
- `2-7a-usecase-thiet-lap-va-tham-gia-giai-dau.puml`
- `2-7b-usecase-van-hanh-tran-dau-giai-dau.puml`
- `2-8-activity-quy-trinh-may-chu.puml`
- `2-9-activity-quy-trinh-giai-dau.puml`
- `2-10-activity-quy-trinh-upload-game.puml`

Ngoài ra, các biểu đồ Chương 4 và Chương 5 cũng có bản `.puml` trong cùng thư mục để tiếp tục chỉnh sửa nếu cần.

## Còn thiếu bản Astah vẽ tay

Các biểu đồ sau hiện vẫn chủ yếu là ảnh sinh tự động từ Mermaid/PlantUML, chưa thấy file `.asta` trong `Diagram_finally`:

| Mục | Ảnh đang dùng | Gợi ý file Astah cần vẽ |
|---|---|---|
| Kiến trúc đa tầng hệ thống | `Hinhve/Chuong4/Kien-truc-da-tang-he-thong.png` | `Diagram_finally/Architecture/Kien-truc-da-tang-he-thong.asta` |
| Biểu đồ gói Frontend | `Hinhve/Chuong4/Bieu-do-goi-frontend.png` | `Diagram_finally/Architecture/Bieu-do-goi-frontend.asta` |
| Biểu đồ gói Backend | `Hinhve/Chuong4/Bieu-do-goi-backend.png` | `Diagram_finally/Architecture/Bieu-do-goi-backend.asta` |
| Thiết kế gói Đăng tải game | `Hinhve/Chuong4/Thiet-ke-goi-dang-tai-game.png` | `Diagram_finally/Package/Thiet-ke-goi-dang-tai-game.asta` |
| Thiết kế gói Giải đấu | `Hinhve/Chuong4/Thiet-ke-goi-giai-dau.png` | `Diagram_finally/Package/Thiet-ke-goi-giai-dau.asta` |
| Thiết kế lớp Tạo giải đấu | `Hinhve/Chuong4/Thiet-ke-lop-tao-giai-dau.png` | `Diagram_finally/Class/Thiet-ke-lop-tao-giai-dau.asta` |
| Biểu đồ trình tự Tạo giải đấu | `Hinhve/Chuong4/Bieu-do-trinh-tu-tao-giai-dau.png` | `Diagram_finally/Sequence/Bieu-do-trinh-tu-tao-giai-dau.asta` |
| ERD Cộng đồng và máy chủ | `Hinhve/Chuong4/ERD-cong-dong-may-chu.png` | `Diagram_finally/ERD/ERD-cong-dong-may-chu.asta` |
| ERD Game | `Hinhve/Chuong4/ERD-game.png` | `Diagram_finally/ERD/ERD-game.asta` |
| ERD Giải đấu | `Hinhve/Chuong4/ERD-giai-dau.png` | `Diagram_finally/ERD/ERD-giai-dau.asta` |
| Game SDK bridge | `Hinhve/Chuong5/SDK-bridge.png` | `Diagram_finally/Solution/SDK-bridge.asta` |
| Vòng đời giải đấu | `Hinhve/Chuong5/Tournament-lifecycle.png` | `Diagram_finally/Solution/Tournament-lifecycle.asta` |

## Không bắt buộc vẽ bằng Astah

Các hình sau là bảng hoặc ảnh giao diện nên không cần chuyển sang Astah:

- `Hinhve/Chuong2/UsecaseSpec/*.png`
- `Hinhve/Bangbieu/*.png`
- `Hinhve/Chuong4/Giao-dien-*.png`
