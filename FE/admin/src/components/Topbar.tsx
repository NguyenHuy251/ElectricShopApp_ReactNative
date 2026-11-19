import { Button, Space, Tooltip } from 'antd';
import { useAuth } from '../auth/AuthContext';
import { labels } from '../utils/format';
import { CalendarOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
export default function Topbar({ title, toggle, sidebarHidden, toggleSidebar }: { title: string; toggle: () => void; sidebarHidden: boolean; toggleSidebar: () => void }) {
  const { user, logout } = useAuth();
  return <header className="topbar"><Space size={14}><Tooltip title={sidebarHidden ? 'Hiện menu' : 'Ẩn menu'}><Button className="sidebar-toggle" icon={sidebarHidden ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggleSidebar} aria-label={sidebarHidden ? 'Hiện menu' : 'Ẩn menu'} aria-expanded={!sidebarHidden} aria-controls="admin-sidebar" /></Tooltip><Button className="menu-toggle" icon={<MenuOutlined />} onClick={toggle} aria-label="Mở menu" /><div className="workspace-breadcrumb"><span>ElectricShop</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div></Space><div className="topbar-actions"><span className="workspace-date"><CalendarOutlined /> {new Intl.DateTimeFormat('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}</span><div className="user-avatar" aria-hidden="true">{user?.ho_ten?.trim().charAt(0) || 'E'}</div><div className="user-copy"><strong>{user?.ho_ten}</strong><span>{labels[user?.vai_tro || '']}</span></div><Button aria-label="Đăng xuất" icon={<LogoutOutlined />} onClick={logout}>Đăng xuất</Button></div></header>;
}
