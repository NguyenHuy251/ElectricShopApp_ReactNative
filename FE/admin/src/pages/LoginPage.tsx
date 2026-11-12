import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { startPage } from '../auth/permissions';
import { errorMessage } from '../utils/errors';
import { ThunderboltFilled, SafetyCertificateOutlined, BarChartOutlined, AppstoreOutlined } from '@ant-design/icons';
export default function LoginPage() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to={startPage(user)} replace />;
  return <div className="login-page"><section className="login-story"><div className="login-brand"><ThunderboltFilled /> ElectricShop</div><div className="login-story-copy"><span className="login-kicker">KHÔNG GIAN QUẢN TRỊ</span><h1>Mọi hoạt động.<br />Một điểm chạm.</h1><p>Quản lý cửa hàng hiệu quả hơn, dành thời gian cho những điều quan trọng.</p><div className="login-features"><span><AppstoreOutlined /> Sản phẩm & kho hàng</span><span><BarChartOutlined /> Kinh doanh & báo cáo</span><span><SafetyCertificateOutlined /> Phân quyền bảo mật</span></div></div><small>ElectricShop · Đồng hành cùng sự phát triển</small></section><div className="login-box"><div className="login-symbol"><ThunderboltFilled /></div><span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập quản trị</h2><p className="login-description">Đăng nhập để bắt đầu ngày làm việc của bạn.</p>
    {error && <Alert type="error" showIcon message={error} />}
    <Form layout="vertical" onFinish={async (values: { username: string; password: string }) => {
      if (loading) return; setLoading(true); setError('');
      try { await login(values.username, values.password); } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
    }}>
      <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, whitespace: true, message: 'Nhập tên đăng nhập' }]}><Input autoComplete="username" /></Form.Item>
      <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}><Input.Password autoComplete="current-password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>Đăng nhập</Button>
    </Form><p className="login-security"><SafetyCertificateOutlined /> Không gian dành cho quản trị viên và nhân viên</p></div></div>;
}
