# ElectricShop Admin — giao diện quản trị

## Định hướng

Không gian làm việc sáng, xanh trầm, ít trang trí; ưu tiên khả năng đọc bảng, tìm dữ liệu và hoàn thành tác vụ. Sử dụng React, Ant Design và icon hiện có. Không thêm dependency hoặc đổi API.

Theme Ant Design ở `src/main.tsx`; stylesheet chung ở `src/styles.css`.

| Thành phần | Quy ước |
| --- | --- |
| Màu | Primary `#126b60`, chữ `#182d2a`, chữ phụ `#6a7c76` |
| Bề mặt | Nền `#f5f7f6`, card trắng, border `#e2e9e4` |
| Typography | Font hệ thống; tiêu đề 30px, nội dung 14px, bảng 13px, nhãn 12–13px |
| Bố cục | Sidebar 252px; nội dung tối đa 1640px; khoảng cách trang 24–32px |
| Điều khiển | Chiều cao mặc định 40px; card bo 16px; input bo 10px |
| Responsive | Menu drawer dưới 1000px; header xếp dọc trên màn hình hẹp; bảng cuộn trong vùng bảng |

Sidebar nhóm các chức năng theo vận hành, danh mục kinh doanh, khách hàng/đội ngũ và cài đặt. Hiển thị menu vẫn tuân theo quyền tài khoản.

## Popup thêm và sửa

`src/components/FormModal.tsx` là vỏ popup dùng chung: căn giữa, tiêu đề rõ, nội dung cuộn độc lập và footer lưu/hủy luôn tiếp cận được, kể cả cửa sổ thấp. Popup không đóng bằng Escape hoặc backdrop khi `confirmLoading` đang bật. Handler của từng màn hình tiếp tục quyết định khả năng đóng và lưu.

| Nghiệp vụ | Cách sử dụng |
| --- | --- |
| Sản phẩm / ảnh / biến thể | Popup sản phẩm hiện có, chia nhóm trường và giữ validation |
| Danh mục / thương hiệu / nhân viên / tài khoản khách | Popup của `ResourcePage`; lấy dữ liệu mới khi mở sửa |
| Thông số / nhóm thông số / gán theo danh mục | Popup riêng; cấu hình bắt buộc được sửa trong popup, bảng hiển thị trạng thái |
| Đơn hàng | Nút cập nhật mở popup chọn bước xử lý hợp lệ; cảnh báo hoàn tồn khi hủy |
| Nhập kho | Nút tạo phiếu mở popup thay cho form trên trang |
| Voucher | Popup tạo mã, popup sửa trạng thái và popup cấp riêng cho khách |
| Hồ sơ / mật khẩu | Trang hiển thị thông tin; nút chỉnh sửa mở popup tương ứng |
| Liên hệ / phân quyền / tạo tài khoản nhân viên | Giữ thao tác hiện có trong vỏ popup thống nhất |

Không mở thêm chức năng tạo/sửa mà backend hoặc quyền hiện tại không hỗ trợ. Drawer xem thông tin đơn và chi tiết dữ liệu tiếp tục phục vụ việc đọc. Không thay đổi dữ liệu khi chỉ mở hoặc hủy popup.

## Thành phần dùng chung

- `PageHeading`: tiêu đề, mô tả công việc và nhóm hành động chính.
- `ResourcePage`: tìm kiếm, lọc, tổng kết quả, phân trang, CRUD và chi tiết.
- `FormModal`: vỏ popup; form và nghiệp vụ nằm tại màn hình gọi.
- `Sidebar` / `Topbar`: nhóm nghiệp vụ, breadcrumb và nhận diện tài khoản.

Khi thêm màn hình, dùng lại các thành phần này; giữ tên trường tiếng Việt và cách xử lý lỗi API hiện tại. Dùng số liệu API cho bảng và thống kê, không tạo chỉ số minh họa trong giao diện thật.

## Bảo vệ dropdown và hiệu năng

Giữ nguyên cơ chế lazy loading, preload module được cấp quyền, debounce tìm kiếm và tái sử dụng dữ liệu phân quyền. Không thêm request lúc mở popup nếu dữ liệu đã sẵn sàng.

Ant Design điều khiển motion qua `ConfigProvider`. Không tắt CSS animation của popup bằng tay, không áp dụng `transition: all`, transform toàn bộ button hoặc thay đổi quy tắc định vị popup. Đây là phần quan trọng để tránh lỗi dropdown kẹt hoặc nằm ngoài màn hình đã gặp trước đây.

## Kiểm tra

- `npm run build`: TypeScript và Vite production build.
- `npm run test:e2e`: CRUD, quyền, dropdown, tải dữ liệu, popup mới, lưu/hủy, lỗi lưu và bàn phím.
- Audit giao diện bằng Chrome với API local thật: 14 trang, 30 bố cục ở 390/768/1440px, thêm ảnh popup và đăng nhập. Báo cáo nằm trong `artifacts/admin-workspace/` ở gốc repository. Audit chỉ đọc dữ liệu và hủy popup; ảnh có thể chứa thông tin local nên không commit.
- Build hiện còn cảnh báo bundle lớn của Ant Design/ExcelJS. Xuất Excel vẫn được tải qua dynamic import như trước.
