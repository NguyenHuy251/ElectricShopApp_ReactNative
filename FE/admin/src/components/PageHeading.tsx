import type { ReactNode } from 'react';

const descriptions: Record<string, string> = {
  'Sản phẩm': 'Quản lý danh mục kinh doanh, hình ảnh, biến thể và tồn kho.',
  'Danh mục': 'Sắp xếp sản phẩm để khách hàng tìm đúng thiết bị cần mua.',
  'Thương hiệu': 'Quản lý thông tin và nhận diện các thương hiệu trong cửa hàng.',
  'Nhân viên': 'Quản lý hồ sơ, tài khoản và quyền truy cập của đội ngũ.',
  'Khách hàng / Tài khoản': 'Theo dõi tài khoản và quản lý thông tin khách hàng.',
  'Liên hệ': 'Tiếp nhận yêu cầu và phản hồi khách hàng từ một nơi.',
  'Đơn hàng': 'Theo dõi đơn mua, kiểm tra thông tin và cập nhật tiến trình xử lý.',
  'Đánh giá': 'Theo dõi trải nghiệm sản phẩm và quản lý phản hồi công khai.',
  'Mã giảm giá': 'Quản lý chương trình ưu đãi và tặng voucher cho khách hàng.',
  'Nhập kho': 'Ghi nhận hàng nhập và kiểm tra lịch sử thay đổi tồn kho.',
  'Tài khoản của tôi': 'Cập nhật thông tin cá nhân và bảo vệ tài khoản làm việc.',
};

export default function PageHeading({ title, description, eyebrow = 'KHÔNG GIAN QUẢN TRỊ', actions, children }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode; children?: ReactNode }) {
  return <div className="page-heading"><div className="page-heading-copy"><span className="eyebrow">{eyebrow}</span><h1 className="page-title">{title}</h1>{(description || descriptions[title]) && <p className="page-description">{description || descriptions[title]}</p>}{children}</div>{actions && <div className="page-heading-actions">{actions}</div>}</div>;
}
