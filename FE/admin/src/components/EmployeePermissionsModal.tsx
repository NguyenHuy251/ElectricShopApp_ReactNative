import { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Checkbox, Modal, Select, Space } from 'antd';
import { permissionApi, type PermissionData, type StaffAccount } from '../api/permission.api';
import type { Permission } from '../auth/permissions';
import { errorMessage } from '../utils/errors';

interface Props {
  data?: PermissionData;
  onSaved: () => Promise<void>;
}
export interface EmployeePermissionsHandle {
  open: (account: StaffAccount | null) => void;
}
const EmployeePermissionsModal = memo(forwardRef<EmployeePermissionsHandle, Props>(function EmployeePermissionsModal({ data, onSaved }, ref) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<number>();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  useImperativeHandle(ref, () => ({
    open(account) {
      if (saving.current) return;
      // Keep dialog updates local: opening it must not rebuild the staff table.
      // Initialize the draft in the same batch so the first frame is ready.
      setAccountId(account?.ma_tai_khoan);
      setPermissions([...(account?.permissions || [])]);
      setOpen(true);
    },
  }), []);
  const accountsById = useMemo(() => new Map((data?.accounts || []).map(item => [item.ma_tai_khoan, item])), [data]);
  const accountOptions = useMemo(() => data?.accounts.map(item => ({ value: item.ma_tai_khoan, label: `${item.ho_ten} · ${item.ten_dang_nhap}${item.ma_nhan_vien ? '' : ' · Chưa liên kết hồ sơ'}` })), [data]);
  const selected = accountId === undefined ? undefined : accountsById.get(accountId);
  return <Modal open={open} transitionName="" maskTransitionName="" title={selected ? `Phân quyền: ${selected.ho_ten}` : 'Phân quyền tài khoản nhân viên'} width={720} okText="Lưu quyền" cancelText="Hủy" confirmLoading={busy} okButtonProps={{ disabled: !selected }} cancelButtonProps={{ disabled: busy }} maskClosable={!busy} keyboard={!busy} onCancel={() => { if (!saving.current) setOpen(false); }} onOk={async () => {
    if (!selected || saving.current) return;
    saving.current = true; setBusy(true);
    try { await permissionApi.save(selected.ma_tai_khoan, permissions); setOpen(false); message.success('Đã lưu quyền nhân viên'); await onSaved(); }
    catch (error) { message.error(errorMessage(error)); }
    finally { saving.current = false; setBusy(false); }
  }}>
    <Select aria-label="Tài khoản phân quyền" placeholder="Chọn tài khoản nhân viên" value={accountId} disabled={busy} showSearch optionFilterProp="label" style={{ width: '100%', marginBottom: 12 }}
      options={accountOptions}
      onChange={(id: number) => { setAccountId(id); setPermissions([...(accountsById.get(id)?.permissions || [])]); }} />
    <p className="permission-secondary">Nhân viên được thao tác và xóa dữ liệu trong nhóm đã cấp. Quản lý tài khoản, nhân sự và cấp quyền chỉ dành cho Admin.</p>
    <Space wrap style={{ marginBottom: 18 }}>
      {data?.presets.map(preset => <Button key={preset.name} disabled={busy || !selected} onClick={() => setPermissions([...preset.permissions])}>{preset.name}</Button>)}
      <Button disabled={busy || !selected} onClick={() => setPermissions([])}>Bỏ tất cả</Button>
    </Space>
    <div className="permission-grid">{data?.groups.map(group => <label className={`permission-option ${permissions.includes(group.code) ? 'selected' : ''}`} key={group.code}>
      <Checkbox disabled={busy || !selected} checked={permissions.includes(group.code)} onChange={event => setPermissions(current => event.target.checked ? [...current, group.code] : current.filter(code => code !== group.code))} />
      <span><strong>{group.name}</strong><small>{group.description}</small></span>
    </label>)}</div>
    <Alert style={{ marginTop: 18 }} type="warning" showIcon message={permissions.length ? `Đang cấp ${permissions.length} nhóm chức năng, bao gồm thao tác xóa nếu nhóm hỗ trợ.` : 'Không cấp nhóm nào: nhân viên chỉ truy cập được tài khoản của mình.'} description="Thay đổi có hiệu lực ngay khi lưu." />
  </Modal>;
}));
export default EmployeePermissionsModal;
