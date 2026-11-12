import { Button, Space } from 'antd';
import { useAuth } from '../auth/AuthContext';
import { labels } from '../utils/format';
import { LogoutOutlined, MenuOutlined } from '@ant-design/icons';
export default function Topbar({ title, toggle }: { title: string; toggle: () => void }) {
  const { user, logout } = useAuth();
  return <header className="topbar"><Space size={14}><Button className="menu-toggle" icon={<MenuOutlined />} onClick={toggle} aria-label="Mở menu" /><div><span className="topbar-subtitle">Không gian làm việc / {title}</span><strong>{title}</strong></div></Space><div className="topbar-actions"><div className="user-avatar" aria-hidden="true">{user?.ho_ten?.trim().charAt(0) || 'E'}</div><div className="user-copy"><strong>{user?.ho_ten}</strong><span>{labels[user?.vai_tro || '']}</span></div><Button icon={<LogoutOutlined />} onClick={logout}>Đăng xuất</Button></div></header>;
}
