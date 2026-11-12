import { Alert, App, Avatar, Button, Descriptions, Form, Input } from 'antd';
import { EditOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../utils/errors';
import { labels } from '../utils/format';
import Modal from '../components/FormModal';
import PageHeading from '../components/PageHeading';

export default function AccountPage() {
  const {user,restore,logout}=useAuth();
  const {message}=App.useApp();
  const [busy,setBusy]=useState(false);
  const lock = useRef(false);
  const [editor, setEditor] = useState<'profile' | 'password' | null>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm]=Form.useForm();
  const save=async(url:string,values:unknown)=>{
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try{await api.put(url,values);message.success('Đã lưu thay đổi');if(url==='/auth/me')await restore();else {passwordForm.resetFields();logout();}setEditor(null);}
    catch(err){message.error(errorMessage(err));}finally{lock.current=false;setBusy(false);}
  };
  return <><PageHeading title="Tài khoản của tôi" />{user?.vai_tro === 'NhanVien' && !user.permissions?.length && <Alert type="info" showIcon message="Tài khoản chưa được cấp quyền nghiệp vụ. Hãy liên hệ quản trị viên để được phân quyền." style={{ marginBottom: 20 }} />}
    <div className="account-grid"><section className="card account-profile"><Avatar size={72}>{user?.ho_ten?.trim().charAt(0) || 'E'}</Avatar><h2>{user?.ho_ten}</h2><span className="account-role">{labels[user?.vai_tro || '']}</span><p>{user?.email}</p><Button aria-label="Chỉnh sửa hồ sơ" icon={<EditOutlined />} type="primary" onClick={() => { profileForm.resetFields(); profileForm.setFieldsValue(user || {}); setEditor('profile'); }}>Chỉnh sửa hồ sơ</Button></section><div className="account-sections"><section className="card"><div className="panel-heading"><div><span className="eyebrow">THÔNG TIN CÁ NHÂN</span><h3>Hồ sơ của bạn</h3></div></div><Descriptions column={1} items={[
      { key: 'username', label: 'Tên đăng nhập', children: user?.ten_dang_nhap }, { key: 'name', label: 'Họ tên', children: user?.ho_ten }, { key: 'email', label: 'Email', children: user?.email }, { key: 'phone', label: 'Điện thoại', children: user?.so_dien_thoai || 'Chưa cập nhật' }, { key: 'address', label: 'Địa chỉ', children: user?.dia_chi || 'Chưa cập nhật' },
    ]} /></section><section className="card security-panel"><div className="security-icon"><SafetyCertificateOutlined /></div><div><h3>Bảo mật tài khoản</h3><p>Đổi mật khẩu để bảo vệ tài khoản làm việc. Bạn sẽ đăng nhập lại sau khi đổi mật khẩu.</p></div><Button aria-label="Đổi mật khẩu" icon={<LockOutlined />} onClick={() => { passwordForm.resetFields(); setEditor('password'); }}>Đổi mật khẩu</Button></section></div></div>
    <Modal open={editor === 'profile'} title="Chỉnh sửa hồ sơ" confirmLoading={busy} cancelButtonProps={{disabled:busy}} onCancel={() => {if(!busy)setEditor(null);}} onOk={() => profileForm.submit()} okText="Lưu hồ sơ" cancelText="Hủy" width={640}><Form form={profileForm} layout="vertical" disabled={busy} onFinish={v=>save('/auth/me',v)}><div className="form-grid">
    <Form.Item name="ho_ten" label="Họ tên" rules={[{required:true,max:100}]}><Input/></Form.Item>
    <Form.Item name="email" label="Email" rules={[{required:true,type:'email'}]}><Input/></Form.Item>
    <Form.Item name="so_dien_thoai" label="Điện thoại"><Input maxLength={15}/></Form.Item><Form.Item name="dia_chi" label="Địa chỉ"><Input maxLength={255}/></Form.Item>
    </div></Form></Modal>
    <Modal open={editor === 'password'} title="Đổi mật khẩu" confirmLoading={busy} cancelButtonProps={{disabled:busy}} onCancel={() => {if(!busy)setEditor(null);}} onOk={() => passwordForm.submit()} okText="Đổi mật khẩu" cancelText="Hủy" width={560}><Form form={passwordForm} disabled={busy} layout="vertical" onFinish={({confirm,...v})=>save('/auth/password',v)}>
    <Form.Item name="mat_khau_cu" label="Mật khẩu hiện tại" rules={[{required:true}]}><Input.Password autoComplete="current-password"/></Form.Item>
    <Form.Item name="mat_khau_moi" label="Mật khẩu mới" rules={[{required:true,min:8,max:72}]}><Input.Password autoComplete="new-password"/></Form.Item>
    <Form.Item name="confirm" label="Nhập lại mật khẩu mới" dependencies={['mat_khau_moi']} rules={[{required:true},({getFieldValue})=>({validator:(_,v)=>v===getFieldValue('mat_khau_moi') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu không khớp'))})]}><Input.Password autoComplete="new-password"/></Form.Item>
    </Form></Modal></>;
}
