import Modal from '../components/FormModal';
import { useCallback, useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Table,
  Switch,
  Select,
  Space,
  Alert,
  Tag,
  Tooltip,
} from 'antd';
import { api } from '../api/api';
import { useLoad } from '../hooks/useLoad';
import LoadError from '../components/LoadError';
import { errorMessage } from '../utils/errors';
import { money, dateTime } from '../utils/format';
import {
  PlusOutlined,
  EditOutlined,
  GiftOutlined,
  UserOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import PageHeading from '../components/PageHeading';

export default function ShopOperationsPage({ kind }: { kind: 'vouchers' | 'inventory' }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [grantForm] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedVoucherForGrant, setSelectedVoucherForGrant] = useState<any>(null);
  const [lookingUpUser, setLookingUpUser] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string>('');
  const [granting, setGranting] = useState(false);
  const [variants, setVariants] = useState<{ ma_bien_the: number; ten_bien_the: string }[]>([]);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [statusForm] = Form.useForm();

  const saveVoucherStatus = async (values: { trang_thai: boolean }) => {
    if (busy || !editingVoucher) return;
    setBusy(true);
    try {
      await api.put(`/shop/vouchers/${editingVoucher.ma_voucher}`, values);
      message.success('Đã cập nhật mã giảm giá');
      setEditingVoucher(null);
      await result.reload();
    } catch (error) { message.error(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const result = useLoad(
    useCallback(async () => {
      const response = await api.get(`/shop/${kind}`);
      return response.data.data as any[];
    }, [kind])
  );

  const products = useLoad(
    useCallback(async () => {
      const response = await api.get('/san-pham', { params: { limit: 100 } });
      return response.data.data as any[];
    }, []), kind === 'inventory'
  );

  const save = async (values: any) => {
    setBusy(true);
    try {
      await api.post(`/shop/${kind}`, values);
      if (kind === 'vouchers' && values.tai_khoan_rieng?.trim()) {
        try {
          await api.post('/shop/vouchers/grant', {
            ma_code: values.ma_code,
            tai_khoan: values.tai_khoan_rieng.trim(),
            so_ngay_hieu_luc: 30,
          });
          message.success(`Đã tạo và kích hoạt mã ${values.ma_code} riêng cho tài khoản ${values.tai_khoan_rieng}!`);
        } catch (grantErr) {
          message.warning(`Đã tạo voucher nhưng chưa kích hoạt được cho tài khoản: ${errorMessage(grantErr)}`);
        }
      } else {
        message.success('Đã lưu');
      }
      form.resetFields();
      setVariants([]);
      setShowForm(false);
      await result.reload();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openGrantModal = (voucher: any = null) => {
    setSelectedVoucherForGrant(voucher);
    setFoundUser(null);
    setLookupError('');
    grantForm.resetFields();
    if (voucher) {
      grantForm.setFieldsValue({
        ma_voucher: voucher.ma_voucher,
        so_ngay_hieu_luc: 30,
      });
    } else {
      grantForm.setFieldsValue({
        so_ngay_hieu_luc: 30,
      });
    }
    setShowGrantModal(true);
  };

  const handleLookupUser = async () => {
    const val = grantForm.getFieldValue('tai_khoan')?.trim();
    if (!val) {
      setLookupError('Vui lòng nhập số điện thoại hoặc tên đăng nhập để kiểm tra.');
      setFoundUser(null);
      return;
    }
    setLookingUpUser(true);
    setLookupError('');
    try {
      const res = await api.get('/shop/vouchers/lookup-user', { params: { q: val } });
      const users = res.data.data as any[];
      if (users && users.length > 0) {
        setFoundUser(users[0]);
        setLookupError('');
      } else {
        setFoundUser(null);
        setLookupError(`Không tìm thấy tài khoản nào khớp với "${val}".`);
      }
    } catch (e) {
      setFoundUser(null);
      setLookupError(errorMessage(e));
    } finally {
      setLookingUpUser(false);
    }
  };

  const handleGrantVoucher = async (values: any) => {
    setGranting(true);
    try {
      const res = await api.post('/shop/vouchers/grant', {
        ma_voucher: values.ma_voucher,
        tai_khoan: values.tai_khoan?.trim(),
        so_ngay_hieu_luc: values.so_ngay_hieu_luc || 30,
      });
      message.success(res.data.message || 'Đã kích hoạt voucher thành công vào ví khách hàng!');
      setShowGrantModal(false);
      grantForm.resetFields();
      setFoundUser(null);
      await result.reload();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setGranting(false);
    }
  };

  return (
    <>
      <PageHeading title={kind === 'vouchers' ? 'Mã giảm giá' : 'Nhập kho'} actions={<Space wrap>
          {kind === 'vouchers' && (
            <Button
              type="default"
              style={{ color: '#126b60' }}
              icon={<GiftOutlined />}
              onClick={() => openGrantModal(null)}
            >
              Kích hoạt riêng cho tài khoản
            </Button>
          )}
          <Button
            type="primary"
            aria-label={kind === 'vouchers' ? 'Thêm mã giảm giá' : 'Tạo phiếu nhập'}
            icon={<PlusOutlined />}
            disabled={busy}
            onClick={() => { form.resetFields(); setVariants([]); setShowForm(true); }}
          >
            {kind === 'vouchers' ? 'Thêm mã giảm giá' : 'Tạo phiếu nhập'}
          </Button>
        </Space>} />

      <LoadError
        error={result.error || products.error}
        retry={() => {
          void result.reload();
          if (kind === 'inventory') void products.reload();
        }}
      />

        <Modal open={showForm} title={kind === 'vouchers' ? 'Tạo mã giảm giá' : 'Tạo phiếu nhập'} onCancel={() => {if(!busy)setShowForm(false);}} onOk={() => form.submit()} confirmLoading={busy} cancelButtonProps={{disabled:busy}} okText="Lưu" cancelText="Hủy">
          <Form form={form} layout="vertical" disabled={busy} onFinish={save}><div className="form-grid">
            {kind === 'vouchers' ? (
              <>
                <Form.Item
                  name="ma_code"
                  label="Mã giảm giá"
                  rules={[
                    {
                      required: true,
                      pattern: /^[A-Za-z0-9_-]{3,32}$/,
                      message: 'Nhập 3–32 ký tự chữ, số, gạch ngang hoặc gạch dưới.',
                    },
                  ]}
                >
                  <Input maxLength={32} autoComplete="off" placeholder="Ví dụ: SALE50K, VIP100K..." />
                </Form.Item>
                <Form.Item name="giam_tien" label="Số tiền giảm (đ)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={1e9} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="don_toi_thieu" label="Giá trị đơn tối thiểu (đ)" initialValue={0}>
                  <InputNumber min={0} max={1e12} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="so_luot" label="Tổng lượt sử dụng" rules={[{ required: true }]}>
                  <InputNumber min={1} max={1e6} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="bat_dau" label="Bắt đầu" rules={[{ required: true }]}>
                  <Input type="datetime-local" />
                </Form.Item>
                <Form.Item name="ket_thuc" label="Kết thúc" rules={[{ required: true }]}>
                  <Input type="datetime-local" />
                </Form.Item>
                <Form.Item
                  name="tai_khoan_rieng"
                  label="Kích hoạt riêng ngay cho tài khoản (Tùy chọn: Nhập SĐT hoặc Tên đăng nhập)"
                  help="Nếu nhập, hệ thống sẽ tự động gán mã giảm giá này trực tiếp vào ví của khách hàng đó."
                >
                  <Input prefix={<UserOutlined />} placeholder="Ví dụ: 0912345678 hoặc dung2005" allowClear />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item name="ma_san_pham" label="Sản phẩm" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={(products.data || []).map((p) => ({ value: p.ma_san_pham, label: p.ten_san_pham }))}
                    onChange={async (id: number) => {
                      form.setFieldValue('ma_bien_the', undefined);
                      try {
                        const r = await api.get(`/san-pham/${id}`);
                        setVariants(r.data.data.variants || []);
                      } catch (e) {
                        message.error(errorMessage(e));
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item name="ma_bien_the" label="Biến thể" rules={[{ required: variants.length > 0 }]}>
                  <Select
                    allowClear
                    disabled={!variants.length}
                    options={variants.map((v) => ({ value: v.ma_bien_the, label: v.ten_bien_the }))}
                  />
                </Form.Item>
                <Form.Item name="so_luong" label="Số lượng nhập" rules={[{ required: true }]}>
                  <InputNumber min={1} max={1e6} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="ghi_chu" label="Ghi chú">
                  <Input.TextArea maxLength={500} />
                </Form.Item>
              </>
            )}
          </div></Form>
        </Modal>

      <div className="card mt">
        <Space className="toolbar" wrap>
          <Button onClick={result.reload}>Làm mới</Button>
        </Space>
        <div className="list-caption"><strong>{kind === 'vouchers' ? 'Danh sách mã giảm giá' : 'Lịch sử nhập kho'}</strong><span>{result.data?.length || 0} bản ghi</span></div>
        <Table
          rowKey={kind === 'vouchers' ? 'ma_voucher' : 'ma_nhap'}
          loading={result.loading}
          dataSource={result.data || []}
          scroll={{ x: 1000 }}
          columns={
            kind === 'vouchers'
              ? [
                  {
                    title: 'Mã',
                    dataIndex: 'ma_code',
                    render: (v) => <Tag color="green" style={{ fontWeight: 700, fontSize: 13 }}>{v}</Tag>,
                  },
                  {
                    title: 'Giảm',
                    dataIndex: 'giam_tien',
                    render: (value, r) =>
                      r.loai === 'PhanTram'
                        ? `${value}%${r.giam_toi_da != null ? ` (tối đa ${money(r.giam_toi_da)})` : ''}`
                        : money(value),
                  },
                  { title: 'Đơn tối thiểu', dataIndex: 'don_toi_thieu', render: money },
                  { title: 'Đã dùng', render: (_, r) => `${r.da_dung}/${r.so_luot}` },
                  { title: 'Lượt/khách', render: (_, r) => r.moi_khach || 'Không giới hạn' },
                  { title: 'Hết hạn', dataIndex: 'ket_thuc', render: dateTime },
                  {
                    title: 'Trạng thái',
                    render: (_, r) => <Space wrap><Tag color={r.trang_thai ? 'green' : 'default'}>{r.trang_thai ? 'Hoạt động' : 'Tạm dừng'}</Tag><Button aria-label={`Sửa voucher ${r.ma_code}`} icon={<EditOutlined />} onClick={() => { statusForm.setFieldsValue({trang_thai:Boolean(r.trang_thai)}); setEditingVoucher(r); }} /></Space>,
                  },
                  {
                    title: 'Cấp riêng',
                    render: (_, r) => (
                      <Tooltip title="Nhập SĐT hoặc Tên đăng nhập để kích hoạt voucher này riêng cho khách hàng">
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<GiftOutlined />}
                          onClick={() => openGrantModal(r)}
                        >
                          Tặng khách
                        </Button>
                      </Tooltip>
                    ),
                  },
                ]
              : [
                  { title: 'Sản phẩm', dataIndex: 'ten_san_pham' },
                  { title: 'Biến thể', dataIndex: 'ten_bien_the' },
                  { title: 'Số lượng', dataIndex: 'so_luong' },
                  { title: 'Người nhập', dataIndex: 'ho_ten' },
                  { title: 'Ngày nhập', dataIndex: 'ngay_nhap', render: dateTime },
                  { title: 'Ghi chú', dataIndex: 'ghi_chu' },
                ]
          }
        />
      </div>

      <Modal title={`Chỉnh sửa trạng thái · ${editingVoucher?.ma_code || ''}`} open={!!editingVoucher} confirmLoading={busy} cancelButtonProps={{disabled:busy}} onCancel={() => {if(!busy)setEditingVoucher(null);}} onOk={() => statusForm.submit()} okText="Lưu" cancelText="Hủy" width={520}>
        <p className="modal-description">Tạm dừng hoặc cho phép tiếp tục sử dụng mã giảm giá này. Lịch sử sử dụng được giữ nguyên.</p>
        <Form form={statusForm} layout="vertical" disabled={busy} onFinish={saveVoucherStatus}>
          <Form.Item name="trang_thai" label="Cho phép sử dụng" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
      {/* Modal Kích hoạt Voucher riêng cho tài khoản */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <GiftOutlined style={{ color: '#126b60', fontSize: 20 }} />
            <span>Kích hoạt Voucher riêng cho Tài khoản</span>
          </div>
        }
        open={showGrantModal}
        confirmLoading={granting}
        onCancel={() => {
          if (granting) return;
          setShowGrantModal(false);
          setFoundUser(null);
          setLookupError('');
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={grantForm} layout="vertical" onFinish={handleGrantVoucher} style={{ marginTop: 16 }}>
          <Form.Item
            name="ma_voucher"
            label="Chọn Mã giảm giá"
            rules={[{ required: true, message: 'Vui lòng chọn mã giảm giá cần kích hoạt.' }]}
          >
            <Select
              placeholder="Chọn mã voucher"
              showSearch
              optionFilterProp="label"
              options={(result.data || []).map((v) => ({
                value: v.ma_voucher,
                label: `${v.ma_code} (Giảm ${money(v.giam_tien)} - Đơn từ ${money(v.don_toi_thieu)})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="tai_khoan"
            label="Số điện thoại hoặc Tên đăng nhập khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại hoặc tên đăng nhập của khách hàng.' }]}
            help="Hệ thống sẽ tra cứu và kích hoạt voucher trực tiếp vào ví của khách hàng này."
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                prefix={<UserOutlined style={{ color: '#126b60' }} />}
                placeholder="Ví dụ: 0912345678 hoặc dung2005"
                allowClear
                onPressEnter={handleLookupUser}
              />
              <Button
                icon={<SearchOutlined />}
                loading={lookingUpUser}
                onClick={handleLookupUser}
              >
                Kiểm tra
              </Button>
            </Space.Compact>
          </Form.Item>

          {/* User Lookup Preview */}
          {foundUser && (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: 16 }}
              message={
                <div>
                  <div style={{ fontWeight: 700, color: '#135200' }}>
                    {foundUser.ho_ten || foundUser.ten_dang_nhap} (ID: #{foundUser.ma_tai_khoan})
                  </div>
                  <div style={{ fontSize: 12, color: '#389e0d', marginTop: 2 }}>
                    📱 SĐT: {foundUser.so_dien_thoai || 'Chưa cập nhật'} | 👤 Username: {foundUser.ten_dang_nhap} | 🪙 Xu: {foundUser.diem_thuong || 0}
                  </div>
                </div>
              }
            />
          )}

          {lookupError && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={lookupError}
            />
          )}

          <Form.Item
            name="so_ngay_hieu_luc"
            label="Thời hạn sử dụng sau khi kích hoạt (ngày)"
            initialValue={30}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={365} style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button
              onClick={() => {
                setShowGrantModal(false);
                setFoundUser(null);
                setLookupError('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={granting}
              icon={<GiftOutlined />}
              style={{ backgroundColor: '#126b60', borderColor: '#126b60' }}
            >
              Kích hoạt vào Ví khách hàng
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
