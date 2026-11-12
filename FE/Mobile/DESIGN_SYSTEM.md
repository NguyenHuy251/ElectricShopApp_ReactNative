# ElectricShop Mobile — UI & Design System

## Phạm vi và định hướng

Giao diện sử dụng Expo, TypeScript, Expo Router và các bộ icon Material đã có trong dự án. Phong cách ưu tiên mua sắm: nền sáng, xanh trầm, thông tin rõ ràng, ít trang trí và thao tác chính dễ tìm. Không thêm dependency.

Các thay đổi nằm trong màn hình, component, theme và hook phục vụ hiển thị. API client, authentication, dữ liệu, route và quy tắc nghiệp vụ được giữ nguyên.

## Nền tảng thiết kế

Nguồn token: `constants/shop-theme.ts`.

| Nhóm | Quy ước |
| --- | --- |
| Màu | Primary `#126B60`, secondary `#223D39`, accent `#DCECC4` |
| Bề mặt | Background `#F7F8F6`, surface `#FFFFFF`, border `#E1E7E3` |
| Chữ | Ink `#172B2A`, muted `#627471`; success, warning, danger, info có token riêng |
| Typography | Display 36/44, heading 28/36, title 20/28, subtitle 17/25, body 15/23, caption 12/18, label 13/20 |
| Khoảng cách | 4, 8, 12, 16, 24, 32, 48; lề màn hình thông thường 20 |
| Hình khối | Bo góc 10/16/24; shadow nhẹ, ưu tiên border |
| Tương tác | Input mặc định tối thiểu 48; phản hồi pressed/disabled; điều khiển số lượng 44 |

Font hệ thống iOS/Android hỗ trợ tiếng Việt; giữ khả năng phóng chữ của React Native. Dùng bố cục flex, xuống dòng và ScrollView/FlatList; các màn hình có giới hạn chiều rộng để đọc trên màn hình lớn. Một số thành phần đặc thù có kích thước riêng.

## Component dùng chung

- `components/ui.tsx`: Text, Pressable và TextInput native; hỗ trợ ref, handler, accessibility và style của nơi gọi. Input có trạng thái focus, giữ border báo lỗi. `OrderProgress` biểu diễn trạng thái đơn; `SectionIntro` trình bày tiêu đề và mô tả.
- `components/shop-ui.tsx`: tiêu đề màn hình, thẻ sản phẩm, ảnh dự phòng, loading skeleton tĩnh và empty state.
- `components/product-metrics.tsx`: số đã bán và rating dùng chung cho thẻ/chi tiết. API sản phẩm bổ sung `so_luong_da_ban` (tổng số lượng trong đơn `DaGiao`), `diem_danh_gia` (trung bình sao, null khi chưa có) và `so_luong_danh_gia`. Không dựng số liệu giả hoặc gọi API riêng cho từng thẻ.
- `components/auth-ui.tsx`: khung xác thực, nhãn input, hiển thị mật khẩu, bố cục cuộn tránh bàn phím.
- `hooks/use-reduced-motion.ts`: theo dõi thiết lập hệ điều hành cho transition và cửa sổ chat. Không dùng animation lặp nặng.

Khi bổ sung UI, nhập primitive từ `@/components/ui`, dùng token cho màu và khoảng cách. Giữ điều kiện disabled/loading và handler hiện có khi chỉnh bố cục.

## Kiểm kê màn hình

| Màn hình | Thay đổi chính |
| --- | --- |
| Trang chủ | Tìm kiếm → giới thiệu → danh mục → sản phẩm; tiện ích thành viên đặt sau nội dung mua sắm |
| Sản phẩm | Tìm kiếm rõ ràng, bộ lọc thu gọn, chip trạng thái và thẻ sản phẩm đồng nhất |
| Chi tiết sản phẩm | Ưu tiên ảnh, tên, giá; nhóm thông số bằng divider; giữ thanh mua hàng |
| Giỏ hàng | Tổng tiền và thanh toán cố định dưới danh sách; tăng vùng chạm số lượng |
| Thanh toán | Chia chỉ dẫn nhận hàng/kiểm tra đơn; nhóm form, voucher và tổng tiền rõ ràng |
| Đặt hàng thành công | Trình bày dạng biên nhận và tiến trình đơn |
| Danh sách / chi tiết đơn | Tiến trình trực quan, phân cấp sản phẩm, trạng thái và số tiền |
| Tài khoản | Nhận diện cá nhân; nhóm mua sắm trước quà tặng; giữ form chỉnh sửa |
| Đổi mật khẩu | Tiêu đề hướng dẫn, input và nút thống nhất |
| Đăng nhập / đăng ký / quên mật khẩu | Khung sáng đơn giản, nhãn rõ, bớt minh họa trang trí |
| Voucher | Mã và điều kiện dễ đọc; điều kiện xuống dòng trên màn hình hẹp |
| Điểm danh & quà tặng | Tách số dư, lịch, vòng quay và đổi quà; header cho phép xuống dòng |
| Giới thiệu bạn bè | Đưa mã/copy/chia sẻ lên trước phần giới thiệu chương trình |
| Liên hệ / lịch sử liên hệ | Form rõ nhóm; phân biệt nội dung gửi và phản hồi bằng border |

Bottom tabs bo tròn góc trên; icon active nằm trong nền tròn xanh có viền trắng, nhô lên với transition 180 ms và tắt chuyển động khi Reduce Motion được bật. Giữ nhãn tab và safe area. Các cửa sổ hủy đơn, xác nhận nhận hàng, đánh giá và chat dùng cùng ngôn ngữ giao diện. Bong bóng chat kéo được và mặc định nằm cao hơn vùng thanh toán.

## Xác minh và giới hạn

- `npm run typecheck`: đạt.
- `npm run lint`: không có lỗi; còn cảnh báo hook có sẵn trong products và chi tiết sản phẩm.
- `npm test`: 11/14 đạt; 3 test đăng ký lỗi sẵn tại `utils/registration.ts:17` vì fixture thiếu `ma_moi`. Chưa thay đổi logic đăng ký trong lần redesign.
- Expo export bundle cho iOS và Android thành công. Đây là kiểm tra bundling, không phải build IPA/APK hoặc kiểm thử thiết bị.
- Kiểm tra Expo web trên API local: 18 màn hình, 30 bố cục tại chiều rộng 320/390/768; không ghi nhận lỗi JavaScript, request API thất bại hoặc tràn ngang toàn trang. Báo cáo và ảnh xem trước ở `artifacts/redesign/` tại thư mục gốc; ảnh có thể chứa dữ liệu tài khoản local, không đưa vào git.
- Smoke test thao tác đạt: mở/đóng bộ lọc, sắp xếp, tìm và mở sản phẩm, giỏ hàng → thanh toán, kéo/mở/đóng chat, validation đăng nhập và hiện/ẩn mật khẩu. Không tạo đơn, thay đổi tài khoản hoặc gửi câu hỏi AI trong lần kiểm tra này.
- Cần kiểm tra tiếp trên thiết bị iOS/Android thật: bàn phím, chữ phóng lớn, notch, cử chỉ kéo chat và trải nghiệm đọc màn hình. Chưa tuyên bố đã kiểm thử những môi trường này.
