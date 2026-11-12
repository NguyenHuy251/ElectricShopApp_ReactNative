import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccess } from '../auth/permissions';
import { preloadPage } from '../pageModules';
import { AppstoreOutlined, BarChartOutlined, DashboardOutlined, GiftOutlined, InboxOutlined, MessageOutlined, SettingOutlined, ShoppingCartOutlined, SkinOutlined, StarOutlined, TagsOutlined, TeamOutlined, ThunderboltFilled, UserOutlined } from '@ant-design/icons';
const icons = [DashboardOutlined, ShoppingCartOutlined, AppstoreOutlined, SettingOutlined, SkinOutlined, InboxOutlined, TeamOutlined, UserOutlined, StarOutlined, MessageOutlined, InboxOutlined, GiftOutlined, UserOutlined, BarChartOutlined];
export const navigation = [
  ['/dashboard', 'Tổng quan'], ['/products', 'Sản phẩm'], ['/categories', 'Danh mục'], ['/category-specifications', 'Danh mục thông số'], ['/brands', 'Thương hiệu'],
  ['/orders', 'Đơn hàng'], ['/customers', 'Khách hàng / Tài khoản'], ['/employees', 'Nhân viên'], ['/reviews', 'Đánh giá'], ['/contacts', 'Liên hệ'],
  ['/inventory','Nhập kho'], ['/vouchers','Mã giảm giá'], ['/account','Tài khoản của tôi'],
  ['/reports','Báo cáo'],
];
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return <aside className="sidebar"><div className="brand-mark"><span><ThunderboltFilled /></span><strong>ElectricShop<small>KHÔNG GIAN QUẢN TRỊ</small></strong></div><div className="nav-caption">ĐIỀU HÀNH CỬA HÀNG</div><nav className="sidebar-nav" aria-label="Menu quản trị">{navigation.map(([path, label], index) => {
    const Icon = icons[index];
    return canAccess(user, path) ? <NavLink key={path} to={path} onPointerEnter={() => { void preloadPage(path)?.catch(() => undefined); }} onFocus={() => { void preloadPage(path)?.catch(() => undefined); }} onClick={onNavigate}><span className="nav-icon" aria-hidden="true"><Icon /></span>{label}</NavLink> : null;
  })}</nav><div className="sidebar-footer"><ThunderboltFilled /><div><strong>Vận hành thông minh</strong><small>Cùng phát triển mỗi ngày</small></div></div></aside>;
}
