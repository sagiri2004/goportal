# Đặc tả use case Chương 2.3

File này dùng để chỉnh sửa nội dung đặc tả use case trước khi xuất thành ảnh và chèn vào file LaTeX. Mỗi use case gồm các phần: mã use case, tên use case, tác nhân, mô tả, tiền điều kiện, luồng sự kiện chính, luồng sự kiện thay thế và hậu điều kiện.

## UC001 - Tham gia máy chủ

| Thuộc tính | Nội dung |
|---|---|
| Mã Use case | UC001 |
| Tên Use case | Tham gia máy chủ |
| Tác nhân | Người dùng, Người có quyền duyệt yêu cầu tham gia, Hệ thống |
| Mô tả | Cho phép Người dùng tham gia một máy chủ công khai hoặc gửi yêu cầu tham gia đối với máy chủ cần xét duyệt. Khi yêu cầu được chấp nhận, hệ thống thêm Người dùng vào danh sách thành viên và gán vai trò mặc định. |
| Tiền điều kiện | Người dùng đã đăng nhập; máy chủ tồn tại; Người dùng chưa là thành viên của máy chủ cần tham gia. Với luồng xét duyệt, người xử lý yêu cầu phải có quyền `APPROVE_MEMBERS`. |
| Hậu điều kiện | Nếu thành công, Người dùng trở thành thành viên của máy chủ và có vai trò mặc định. Nếu yêu cầu bị từ chối hoặc dữ liệu không hợp lệ, trạng thái thành viên của Người dùng không thay đổi. |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 1 | Người dùng | Xem danh sách máy chủ hoặc mở chi tiết máy chủ muốn tham gia. |
| 2 | Hệ thống | Kiểm tra trạng thái đăng nhập và kiểm tra máy chủ có tồn tại hay không. |
| 3 | Hệ thống | Kiểm tra Người dùng đã là thành viên của máy chủ hay chưa. |
| 4 | Người dùng | Chọn chức năng tham gia máy chủ. |
| 5 | Hệ thống | Nếu máy chủ công khai, thêm Người dùng vào danh sách thành viên. |
| 6 | Hệ thống | Gán vai trò mặc định của máy chủ cho Người dùng. |
| 7 | Hệ thống | Hiển thị máy chủ trong danh sách máy chủ của Người dùng. |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 4a | Người dùng | Nếu máy chủ không cho tham gia trực tiếp, Người dùng nhập ghi chú và gửi yêu cầu tham gia. |
| 5a | Hệ thống | Tạo yêu cầu tham gia với trạng thái chờ duyệt. |
| 6a | Người có quyền duyệt | Xem danh sách yêu cầu tham gia của máy chủ. |
| 7a | Người có quyền duyệt | Chấp nhận yêu cầu tham gia. |
| 8a | Hệ thống | Cập nhật yêu cầu sang trạng thái được chấp nhận, thêm thành viên và gán vai trò mặc định. |
| 7b | Người có quyền duyệt | Từ chối yêu cầu tham gia. |
| 8b | Hệ thống | Cập nhật yêu cầu sang trạng thái bị từ chối, Người dùng không được thêm vào máy chủ. |
| 5c | Hệ thống | Nếu Người dùng đã là thành viên, hệ thống thông báo lỗi và kết thúc use case. |
| 6c | Hệ thống | Nếu yêu cầu đã được duyệt trước đó, hệ thống không cho xử lý lại yêu cầu. |

## UC002 - Quản lý kênh và phân quyền

| Thuộc tính | Nội dung |
|---|---|
| Mã Use case | UC002 |
| Tên Use case | Quản lý kênh và phân quyền |
| Tác nhân | Chủ máy chủ, Thành viên có quyền quản lý kênh, Hệ thống |
| Mô tả | Cho phép tác nhân có quyền tạo kênh, cập nhật vị trí, đặt kênh riêng tư, thêm hoặc xóa thành viên khỏi kênh riêng tư và thiết lập quyền ghi đè theo vai trò hoặc người dùng. |
| Tiền điều kiện | Tác nhân đã đăng nhập, là thành viên của máy chủ và có quyền `MANAGE_CHANNELS` hoặc `ADMINISTRATOR`. Máy chủ và kênh cha nếu có phải tồn tại hợp lệ. |
| Hậu điều kiện | Kênh và các cấu hình phân quyền được cập nhật trong hệ thống. Thành viên chỉ nhìn thấy hoặc thao tác trên các kênh mà họ có quyền truy cập. |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 1 | Tác nhân | Chọn chức năng tạo hoặc cấu hình kênh trong máy chủ. |
| 2 | Hệ thống | Kiểm tra quyền quản lý kênh của tác nhân. |
| 3 | Tác nhân | Nhập tên kênh, loại kênh, kênh cha và vị trí hiển thị nếu cần. |
| 4 | Hệ thống | Kiểm tra loại kênh hợp lệ và kiểm tra kênh cha thuộc cùng máy chủ. |
| 5 | Hệ thống | Tạo kênh mới hoặc cập nhật cấu hình kênh. |
| 6 | Tác nhân | Thiết lập kênh riêng tư hoặc cấu hình quyền ghi đè cho vai trò/người dùng. |
| 7 | Hệ thống | Lưu cấu hình thành viên kênh và quyền ghi đè. |
| 8 | Hệ thống | Áp dụng quyền truy cập khi thành viên xem danh sách kênh hoặc truy cập kênh. |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 2a | Hệ thống | Nếu tác nhân không có quyền quản lý kênh, hệ thống từ chối thao tác. |
| 4a | Hệ thống | Nếu loại kênh không hợp lệ, hệ thống hiển thị lỗi và yêu cầu nhập lại. |
| 4b | Hệ thống | Nếu kênh cha không phải loại danh mục hoặc không thuộc cùng máy chủ, hệ thống từ chối tạo kênh. |
| 6a | Tác nhân | Thêm thành viên cụ thể vào kênh riêng tư. |
| 7a | Hệ thống | Kiểm tra người được thêm phải là thành viên của máy chủ trước khi lưu. |
| 6b | Tác nhân | Xóa quyền ghi đè hoặc xóa thành viên khỏi kênh riêng tư. |

## UC003 - Đăng tải và kiểm duyệt game

| Thuộc tính | Nội dung |
|---|---|
| Mã Use case | UC003 |
| Tên Use case | Đăng tải và kiểm duyệt game |
| Tác nhân | Nhà phát triển, Quản trị viên, Hệ thống |
| Mô tả | Cho phép Nhà phát triển tạo thông tin game, tải lên file build dạng `zip`, gửi game vào hàng đợi kiểm duyệt và cho phép Quản trị viên cập nhật trạng thái phát hành. |
| Tiền điều kiện | Nhà phát triển đã đăng nhập. Game cộng đồng phải có tiêu đề, slug, ảnh biểu tượng, ảnh capsule, ảnh hero và ít nhất một ảnh chụp màn hình. File build phải là gói hợp lệ và có `index.html`. |
| Hậu điều kiện | Game được lưu ở trạng thái phù hợp với quy trình kiểm duyệt. Nếu được duyệt, game xuất hiện trên chợ game và có thể được người dùng truy cập để chơi. |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 1 | Nhà phát triển | Chọn chức năng tạo game mới. |
| 2 | Nhà phát triển | Nhập tiêu đề, slug, mô tả, chế độ hiển thị, danh mục, thẻ và các tài nguyên hình ảnh. |
| 3 | Hệ thống | Chuẩn hóa slug, kiểm tra các trường bắt buộc và tạo game ở trạng thái `draft`. |
| 4 | Nhà phát triển | Chọn file build dạng `zip` và tải lên hệ thống. |
| 5 | Hệ thống | Kiểm tra Nhà phát triển có phải chủ sở hữu game hay không. |
| 6 | Hệ thống | Lưu file build, kiểm tra checksum, giải nén bundle và kiểm tra file `index.html`. |
| 7 | Hệ thống | Tạo bản build với trạng thái `ready` và sinh đường dẫn chơi game. |
| 8 | Nhà phát triển | Gửi game vào hàng đợi kiểm duyệt. |
| 9 | Hệ thống | Kiểm tra game có ít nhất một build sẵn sàng và cập nhật trạng thái `pending_review`. |
| 10 | Quản trị viên | Kiểm tra nội dung game và cập nhật trạng thái phát hành. |
| 11 | Hệ thống | Nếu được duyệt, cập nhật trạng thái `published` và hiển thị game trên chợ game. |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 3a | Hệ thống | Nếu thiếu tài nguyên bắt buộc của game cộng đồng, hệ thống báo lỗi và không tạo game. |
| 5a | Hệ thống | Nếu Người dùng không phải chủ sở hữu game, hệ thống từ chối upload build. |
| 6a | Hệ thống | Nếu file build không hợp lệ hoặc thiếu `index.html`, hệ thống lưu build thất bại và trả lỗi. |
| 9a | Hệ thống | Nếu game chưa có build sẵn sàng, hệ thống không cho gửi kiểm duyệt. |
| 10a | Quản trị viên | Nếu game chưa đạt yêu cầu, Quản trị viên cập nhật trạng thái `rejected` hoặc `suspended`. |

## UC004 - Tổ chức giải đấu

| Thuộc tính | Nội dung |
|---|---|
| Mã Use case | UC004 |
| Tên Use case | Tổ chức giải đấu |
| Tác nhân | Người tổ chức, Người tham gia, Đội trưởng, Hệ thống |
| Mô tả | Cho phép Người tổ chức tạo giải đấu trong máy chủ, cấu hình thông tin, mở đăng ký, xác nhận check-in và bắt đầu giải đấu để hệ thống sinh bracket. |
| Tiền điều kiện | Người tổ chức đã đăng nhập, là thành viên máy chủ và có quyền `MANAGE_CHANNELS`. Máy chủ tồn tại. Với giải đấu đội, trường số lượng thành viên đội phải hợp lệ. |
| Hậu điều kiện | Giải đấu được tạo và đi qua các trạng thái hợp lệ. Khi bắt đầu thành công, hệ thống có bracket và danh sách trận đấu để phục vụ giai đoạn vận hành giải đấu. |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 1 | Người tổ chức | Chọn tạo giải đấu trong một máy chủ. |
| 2 | Người tổ chức | Nhập tên giải đấu, game, thể thức, số lượng người tham gia, loại tham gia, luật và giải thưởng. |
| 3 | Hệ thống | Kiểm tra quyền tổ chức giải đấu và kiểm tra dữ liệu đầu vào. |
| 4 | Hệ thống | Tạo giải đấu ở trạng thái `draft` và tạo kênh chung của giải đấu. |
| 5 | Người tổ chức | Chuyển giải đấu sang trạng thái `registration`. |
| 6 | Người tham gia | Đăng ký tham gia nếu giải đấu là cá nhân. |
| 7 | Hệ thống | Kiểm tra thời hạn đăng ký, số lượng tối đa và trạng thái giải đấu trước khi lưu người tham gia. |
| 8 | Người tổ chức | Chuyển giải đấu sang trạng thái `check_in`. |
| 9 | Người tham gia | Thực hiện check-in trong thời gian cho phép. |
| 10 | Người tổ chức | Chuyển giải đấu sang trạng thái `in_progress`. |
| 11 | Hệ thống | Sinh bracket, tạo danh sách trận đấu và ghi nhận thời điểm bắt đầu. |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 3a | Hệ thống | Nếu Người tổ chức không có quyền phù hợp, hệ thống từ chối tạo hoặc cập nhật giải đấu. |
| 3b | Hệ thống | Nếu thể thức hoặc loại người tham gia không hợp lệ, hệ thống báo lỗi. |
| 6a | Đội trưởng | Nếu là giải đấu đội, Đội trưởng tạo đội và thêm thành viên. |
| 7a | Hệ thống | Nếu đội vượt quá số lượng thành viên cho phép, hệ thống từ chối thêm thành viên. |
| 7b | Hệ thống | Nếu giải đấu đã hết hạn đăng ký, đủ số lượng hoặc người tham gia đã đăng ký trước đó, hệ thống từ chối đăng ký. |
| 10a | Hệ thống | Nếu chuyển trạng thái không đúng thứ tự, hệ thống báo lỗi chuyển trạng thái không hợp lệ. |
| 10b | Người tổ chức | Người tổ chức có thể hủy giải đấu trước khi giải đấu hoàn thành. |

## UC005 - Vận hành trận đấu và xử lý kết quả

| Thuộc tính | Nội dung |
|---|---|
| Mã Use case | UC005 |
| Tên Use case | Vận hành trận đấu và xử lý kết quả |
| Tác nhân | Người tổ chức, Quản trị giải đấu, Người tham gia, Đội trưởng, Trọng tài, Hệ thống |
| Mô tả | Cho phép người có quyền bắt đầu trận đấu, tạo workspace gồm các kênh phục vụ thi đấu, tiếp nhận báo cáo kết quả, xử lý khiếu nại và cập nhật bracket. |
| Tiền điều kiện | Giải đấu đang ở trạng thái `in_progress`; trận đấu tồn tại và có đủ hai người tham gia hoặc hai đội. Người tổ chức hoặc Quản trị giải đấu có quyền cập nhật giải đấu. |
| Hậu điều kiện | Trận đấu có trạng thái và kết quả được cập nhật nhất quán. Bracket, bảng xếp hạng và trận kế tiếp được cập nhật theo kết quả đã xác nhận hoặc kết quả được ghi đè. |

### Luồng sự kiện chính

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 1 | Người tổ chức | Chọn bắt đầu một trận đấu trong bracket. |
| 2 | Hệ thống | Kiểm tra quyền cập nhật giải đấu và kiểm tra trạng thái trận đấu. |
| 3 | Hệ thống | Chuyển trận đấu từ `pending` hoặc `ready` sang `in_progress`. |
| 4 | Hệ thống | Tạo workspace trận gồm danh mục, kênh đội A, kênh đội B, kênh trọng tài và kênh livestream. |
| 5 | Hệ thống | Gán người chơi vào kênh đội tương ứng và gán vai trò hỗ trợ vào kênh phù hợp. |
| 6 | Người tham gia | Thi đấu và gửi báo cáo kết quả gồm người thắng, điểm số và ảnh minh chứng nếu có. |
| 7 | Hệ thống | Lưu báo cáo kết quả ở trạng thái chờ xác nhận. |
| 8 | Người tổ chức hoặc Quản trị giải đấu | Xác nhận hoặc ghi đè kết quả trận đấu. |
| 9 | Hệ thống | Áp dụng kết quả, cập nhật người thắng, điểm số, bracket và trạng thái trận đấu. |
| 10 | Hệ thống | Nếu không còn trận đấu tiếp theo, cập nhật thứ hạng hoặc hỗ trợ hoàn thành giải đấu. |

### Luồng sự kiện thay thế

| STT | Thực hiện bởi | Hành động |
|---|---|---|
| 2a | Hệ thống | Nếu trận đấu thiếu một trong hai người tham gia, hệ thống không cho bắt đầu trận. |
| 3a | Hệ thống | Nếu trận đấu đã bắt đầu, hệ thống trả về trạng thái hiện tại và không tạo trùng luồng bắt đầu. |
| 4a | Hệ thống | Nếu workspace đã tồn tại, hệ thống tái sử dụng workspace và cập nhật lại thành viên kênh. |
| 6a | Người tham gia | Nếu không đồng ý với kết quả đã báo cáo, Người tham gia gửi khiếu nại kết quả. |
| 7a | Hệ thống | Cập nhật báo cáo gần nhất sang trạng thái `disputed`. |
| 8a | Trọng tài hoặc Quản trị giải đấu | Xem xét khiếu nại và ghi đè kết quả nếu cần. |
| 8b | Hệ thống | Nếu người báo cáo là Người tổ chức, hệ thống tự xác nhận và áp dụng kết quả ngay. |

## Bảng trường dữ liệu tham khảo

| Use case | STT | Trường dữ liệu | Mô tả | Bắt buộc | Điều kiện hợp lệ | Ví dụ |
|---|---:|---|---|---|---|---|
| UC001 | 1 | `server_id` | Định danh máy chủ người dùng muốn tham gia | Có | UUID máy chủ tồn tại | `16b2dfea-11c5-42b1-a587-f07b37b7bc61` |
| UC001 | 2 | `note` | Ghi chú trong yêu cầu tham gia | Không | Chuỗi ký tự sau khi trim | Muốn tham gia team Valorant |
| UC001 | 3 | `approve` | Quyết định xét duyệt yêu cầu | Có với luồng duyệt | `true` hoặc `false` | `true` |
| UC002 | 1 | `name` | Tên kênh | Có khi tạo | Không rỗng, độ dài 1-255 ký tự | `general` |
| UC002 | 2 | `type` | Loại kênh | Có khi tạo | `TEXT`, `VOICE`, `CATEGORY`, `LIVESTREAM` | `TEXT` |
| UC002 | 3 | `subject_type` | Loại đối tượng được ghi đè quyền | Có với overwrite | `ROLE` hoặc `USER` | `ROLE` |
| UC002 | 4 | `allow_bits`, `deny_bits` | Bit quyền cho phép hoặc từ chối | Không | Số nguyên bitset | `1`, `2` |
| UC003 | 1 | `title` | Tên game hiển thị | Có | Không rỗng | Chess Arena |
| UC003 | 2 | `slug` | Định danh thân thiện URL | Có | Kebab-case sau chuẩn hóa | `chess-arena` |
| UC003 | 3 | `file` | File build game | Có khi upload | ZIP hợp lệ, có `index.html` | `dist.zip` |
| UC003 | 4 | `publish_state` | Trạng thái kiểm duyệt | Có với quản trị | `draft`, `pending_review`, `published`, `rejected`, `suspended` | `published` |
| UC004 | 1 | `format` | Thể thức giải đấu | Có | `single_elimination`, `double_elimination` | `single_elimination` |
| UC004 | 2 | `participant_type` | Loại tham gia | Có | `solo` hoặc `team` | `team` |
| UC004 | 3 | `team_size` | Số thành viên mỗi đội | Có với giải đấu đội | Số nguyên dương | `5` |
| UC004 | 4 | `status` | Trạng thái giải đấu | Có khi chuyển trạng thái | `draft`, `registration`, `check_in`, `in_progress`, `completed`, `cancelled` | `registration` |
| UC005 | 1 | `match_id` | Định danh trận đấu | Có | UUID trận đấu thuộc giải đấu | `match-uuid` |
| UC005 | 2 | `winner_id` | Người/đội thắng trận | Có khi báo cáo/ghi đè | ID participant hợp lệ | `participant-uuid` |
| UC005 | 3 | `score1`, `score2` | Điểm hai bên | Có | Số nguyên không âm | `2`, `1` |
| UC005 | 4 | `reason` | Lý do ghi đè kết quả | Có khi override | Không rỗng | Admin verified screenshot |
