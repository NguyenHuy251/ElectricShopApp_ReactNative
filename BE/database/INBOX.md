# Hộp thư khách hàng – cửa hàng

## Triển khai

Trong `BE`, chạy `npm run migrate:inbox` trước khi dùng giao diện mới. Migration chỉ tạo bảng `tin_nhan_ho_tro` và sao chép liên hệ/phản hồi đã có tài khoản sang lịch sử chat, theo thứ tự thời gian. Khóa `legacy_key` ngăn sao chép trùng khi chạy lại. Bảng `lien_he` và dữ liệu gốc được giữ nguyên. Các liên hệ không gắn tài khoản vẫn nằm trong tab khách vãng lai trên admin; không ghép theo email hoặc số điện thoại.

Migration cũng được tích hợp vào script triển khai và migration tổng. Không cần chạy seed hoặc reset database. Dùng migration riêng này khi cập nhật database đang có dữ liệu.

## Phạm vi

- Mỗi tài khoản có một cuộc trò chuyện với cửa hàng. Nhân viên có quyền `contacts` và Admin có thể cùng tiếp nhận, trả lời; đây không phải chat riêng giữa các nhân viên.
- Mobile gộp gửi liên hệ và phản hồi vào `/contact`; `/contact-history` chuyển về cùng hộp thư.
- Admin `/contacts` có danh sách cuộc trò chuyện, tin chưa đọc, nội dung trao đổi và khung trả lời. Tab khách vãng lai giữ quy trình liên hệ cũ.
- Hỗ trợ tin văn bản tối đa 5.000 ký tự, tải tin cũ, thông báo chưa đọc, đã gửi/đã xem và giữ nội dung khi gửi lỗi.
- Đồng bộ bằng polling khi ứng dụng/tab đang hoạt động: Mobile 5 giây; admin 4 giây cho cuộc trò chuyện, 5 giây cho danh sách; thông báo Mobile 10 giây. Không hiển thị trạng thái online hoặc đang nhập giả định. Chưa có push notification khi ứng dụng đã đóng hoặc đính kèm tệp.

## API

| Endpoint | Phạm vi |
| --- | --- |
| `GET/POST /api/inbox/mine` | Đọc/gửi trong cuộc trò chuyện của phiên hiện tại |
| `GET /api/inbox/mine/unread` | Số tin cửa hàng gửi chưa đọc |
| `POST /api/inbox/mine/read` | Đánh dấu đọc đến `up_to` |
| `GET /api/inbox/threads?search=…` | 100 cuộc trò chuyện gần nhất khớp tên/tài khoản; cần quyền `contacts` |
| `GET/POST /api/inbox/threads/:id` | Đọc/trả lời tài khoản được chọn; cần quyền `contacts` |
| `POST /api/inbox/threads/:id/read` | Nhân viên đánh dấu đã đọc |

Đọc tin trả tối đa 50 tin/lượt, `hasMore`, `seenThrough` và `seenAt`. `before` tải lịch sử; `after` tải tăng dần để không bỏ sót khi có nhiều tin mới. Hai cursor không được dùng cùng lúc. Tin nhắn gửi có `noi_dung` và `request_id`; retry cùng nội dung dùng lại mã để tránh tạo bản sao khi mất phản hồi mạng. Giới hạn gửi 60 yêu cầu/phút theo cơ chế rate limit hiện có.

Khách không chọn người nhận hay vai trò người gửi: backend luôn lấy chủ cuộc trò chuyện từ phiên. Biên nhận đọc được giới hạn theo tài khoản, bên gửi và ID đã hiển thị. Trạng thái đã xem là đã mở hộp thư và đi đến vùng tin cuối, không phải xác nhận đã xử lý yêu cầu.

API liên hệ cũ được giữ để phục vụ khách vãng lai và tương thích đường dẫn cũ. Lịch sử tài khoản được nhập ở thời điểm chạy migration; các bản mobile cũ vẫn gửi qua API liên hệ cần được cập nhật sang inbox hoặc chạy lại migration để nhập các liên hệ phát sinh từ client cũ.

## Kiểm tra

`npm test` kiểm tra xác thực, quyền, phạm vi dữ liệu, validation và phân trang. Đặt `$env:INBOX_INTEGRATION='1'` trước khi chạy để kiểm tra migration/chống trùng trên database kiểm thử riêng; tài khoản MySQL cần quyền tạo database. Test không ghi vào cuộc trò chuyện thật của người dùng.

Kiểm tra thêm trên thiết bị Android/iOS thật cho bàn phím, cuộn lịch sử và trở lại ứng dụng từ nền.

Kiểm thử bố cục khi vùng hiển thị co lại: chạy Expo web, rồi trong `FE/admin` đặt `$env:MOBILE_TEST_URL='http://localhost:8092'` (đổi cổng theo Expo) và chạy `npx playwright test tests/mobile-inbox.spec.ts`. Test giữ nội dung nháp nhiều dòng, ô nhập, nút gửi và tin mới nhất trong vùng nhìn thấy khi thu nhỏ/mở rộng màn hình. Trên iPhone, kiểm tra thêm mở/đóng bàn phím, gõ nhiều dòng và gửi tin; trình duyệt không mô phỏng được bàn phím native.
