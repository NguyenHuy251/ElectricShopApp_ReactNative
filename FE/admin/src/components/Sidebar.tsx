import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccess } from '../auth/permissions';
import { preloadPage } from '../pageModules';
import { AppstoreOutlined, BarChartOutlined, DashboardOutlined, GiftOutlined, InboxOutlined, MessageOutlined, SettingOutlined, ShoppingCartOutlined, SkinOutlined, StarOutlined, TagsOutlined, TeamOutlined, ThunderboltFilled, UserOutlined } from '@ant-design/icons';
const icons = [DashboardOutlined, ShoppingCartOutlined, AppstoreOutlined, SettingOutlined, SkinOutlined, InboxOutlined, TeamOutlined, UserOutlined, StarOutlined, MessageOutlined, InboxOutlined, GiftOutlined, UserOutlined, BarChartOutlined];
export const navigation = [
  ['/dashboard', 'Tổng quan'], ['/products', 'Sản phẩm'], ['/categories', 'Danh mục'], ['/category-specifications', 'Danh mục thông số'], ['/brands', 'Thương hiệu'],
  ['/orders', 'Đơn hàng'], ['/customers', 'Khách hàng / Tài khoản'], ['/employees', 'Nhân viên'], ['/reviews', 'Đánh giá'], ['/contacts', 'Hộp thư'],
  ['/inventory','Nhập kho'], ['/vouchers','Mã giảm giá'], ['/account','Tài khoản của tôi'],
  ['/reports','Báo cáo'],
];
const sections = [
  { title: 'TỔNG QUAN & VẬN HÀNH', paths: ['/dashboard', '/orders', '/inventory', '/reports'] },
  { title: 'DANH MỤC KINH DOANH', paths: ['/products', '/categories', '/category-specifications', '/brands', '/vouchers'] },
  { title: 'KHÁCH HÀNG & ĐỘI NGŨ', paths: ['/customers', '/contacts', '/reviews', '/employees'] },
  { title: 'CÀI ĐẶT', paths: ['/account'] },
];
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return <aside className="sidebar"><div className="brand-mark"><span><ThunderboltFilled /></span><strong>ElectricShop<small>ADMIN WORKSPACE</small></strong></div><nav className="sidebar-nav" aria-label="Menu quản trị">{sections.map(section => {
    const items = navigation.filter(([path]) => section.paths.includes(path) && canAccess(user, path));
    if (!items.length) return null;
    return <div className="nav-section" key={section.title}><div className="nav-caption">{section.title}</div>{items.map(([path, label]) => {
    const index = navigation.findIndex(item => item[0] === path);
    const Icon = icons[index];
    return canAccess(user, path) ? <NavLink key={path} to={path} onPointerEnter={() => { void preloadPage(path)?.catch(() => undefined); }} onFocus={() => { void preloadPage(path)?.catch(() => undefined); }} onClick={onNavigate}><span className="nav-icon" aria-hidden="true"><Icon /></span>{label}</NavLink> : null;
  })}</div>;})}</nav><div className="sidebar-footer"><span className="workspace-symbol"><ThunderboltFilled /></span><div><strong>Không gian của bạn</strong><small>Quản lý tốt. Phát triển bền vững.</small></div></div></aside>;
}
