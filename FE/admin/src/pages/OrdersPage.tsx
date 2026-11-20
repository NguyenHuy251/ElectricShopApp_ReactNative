import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Descriptions, Drawer, Empty, Form, Image, Input, Select, Space, Table, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import Modal from '../components/FormModal';
import PageHeading from '../components/PageHeading';
import { orderApi } from '../api/order.api';
import { useLoad } from '../hooks/useLoad';
import LoadError from '../components/LoadError';
import { errorMessage } from '../utils/errors';
import { dateTime, labels, money, options, Status } from '../utils/format';
import type { Order, OrderItem } from '../types';
import { exportExcel,printOrder } from '../utils/export';
export const transitions: Record<Order['trang_thai'], Order['trang_thai'][]> = { ChoXacNhan: ['DaXacNhan', 'DaHuy'], DaXacNhan: ['DangGiao', 'DaHuy'], DangGiao: ['DaHuy'], DaGiao: [], DaHuy: [] };
function confirmationLabel(order: Order) {
  return order.ten_nhan_vien_xac_nhan || (order.trang_thai === 'ChoXacNhan' ? 'Chưa xác nhận' : 'Chưa ghi nhận');
}
export default function OrdersPage() {
  const { message, modal } = App.useApp();
  const result = useLoad(useCallback(() => orderApi.list(), []));
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<string>(); const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Order | null>(null); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [statusForm] = Form.useForm();
  const nextStatus = Form.useWatch('trang_thai', statusForm);
  const run = async (action: () => Promise<unknown>, success?: string) => {
    if (lock.current) throw new Error('Đang xử lý'); lock.current = true; setBusy(true);
    try { await action(); if (success) { message.success(success); await result.reload(); } }
    catch (e) { message.error(errorMessage(e)); throw e; } finally { lock.current = false; setBusy(false); }
  };
  const deferredSearch = useDeferredValue(search).toLocaleLowerCase('vi');
  const searchIndex = useMemo(() => (result.data?.data || []).map(row => ({ row, text: `${row.ma_don_hang} ${row.ho_ten_nguoi_nhan}`.toLocaleLowerCase('vi') })), [result.data]);
  const rows = useMemo(() => searchIndex.filter(({ row, text }) => (!status || row.trang_thai === status) && text.includes(deferredSearch)).map(({ row }) => row), [searchIndex, status, deferredSearch]);
  return <><PageHeading title="Đơn hàng" /><LoadError error={result.error} retry={result.reload} /><div className="card"><Space wrap className="toolbar"><Input.Search placeholder="Mã đơn hoặc người nhận" allowClear onChange={e => { setSearch(e.target.value); setPage(1); }} /><Select placeholder="Trạng thái" allowClear style={{ minWidth: 180 }} options={options(Object.keys(transitions))} onChange={value => { setStatus(value); setPage(1); }} /><Tooltip title="Làm mới"><Button aria-label="Làm mới" icon={<ReloadOutlined />} onClick={result.reload} /></Tooltip><Button onClick={()=>void exportExcel('don-hang',[{header:'Mã đơn',key:'ma_don_hang'},{header:'Người nhận',key:'ho_ten_nguoi_nhan'},{header:'Điện thoại',key:'so_dien_thoai'},{header:'Địa chỉ',key:'dia_chi_giao_hang'},{header:'Tiền hàng',key:'tam_tinh'},{header:'Mã giảm giá',key:'ma_code'},{header:'Giảm giá',key:'giam_gia'},{header:'Phí giao hàng',key:'phi_giao_hang'},{header:'Tổng thanh toán',key:'tong_tien'},{header:'Ngày đặt',key:'ngay_dat'},{header:'Nhân viên xác nhận đơn',key:'ten_nhan_vien_xac_nhan'},{header:'Ngày xác nhận',key:'ngay_xac_nhan'},{header:'Trạng thái',key:'trang_thai'}],rows as unknown as Record<string,unknown>[]).catch(e=>message.error(errorMessage(e)))}>Xuất Excel</Button></Space>
    <div className="list-caption"><strong>Danh sách đơn hàng</strong><span>{rows.length} đơn hàng</span></div>
    <Table<Order> rowKey="ma_don_hang" loading={result.loading} dataSource={rows} scroll={{ x: 1200 }} locale={{ emptyText: <Empty description="Chưa có đơn hàng" /> }} pagination={{ current: Math.min(page, Math.max(1, Math.ceil(rows.length / 10))), pageSize: 10, onChange: setPage, showSizeChanger: false }} columns={[
      { title: 'Mã', dataIndex: 'ma_don_hang' }, { title: 'Người nhận', dataIndex: 'ho_ten_nguoi_nhan' }, { title: 'Điện thoại', dataIndex: 'so_dien_thoai' }, { title: 'Địa chỉ', dataIndex: 'dia_chi_giao_hang' }, { title: 'Voucher', dataIndex: 'ma_code', render: value => value || '—' }, { title: 'Giảm giá', dataIndex: 'giam_gia', render: value => money(value || 0) }, { title: 'Tổng thanh toán', dataIndex: 'tong_tien', render: money }, { title: 'Ngày đặt', dataIndex: 'ngay_dat', render: dateTime }, { title: 'Nhân viên xác nhận đơn', dataIndex: 'ten_nhan_vien_xac_nhan', render: (_, row) => <Tooltip title={row.ngay_xac_nhan ? `Xác nhận lúc ${dateTime(row.ngay_xac_nhan)}` : undefined}>{confirmationLabel(row)}</Tooltip> }, { title: 'Trạng thái', dataIndex: 'trang_thai', render: value => <Status value={value} /> },
      { title: 'Thao tác', render: (_, row) => <Space wrap><Tooltip title="Xem chi tiết"><Button aria-label="Xem chi tiết" icon={<EyeOutlined />} disabled={busy} onClick={() => { void run(async () => setDetail(await orderApi.get(row.ma_don_hang))).catch(() => {}); }} /></Tooltip><Button aria-label={`Cập nhật đơn ${row.ma_don_hang}`} icon={<EditOutlined />} disabled={busy || !transitions[row.trang_thai]?.length} onClick={() => {statusForm.resetFields();setEditingOrder(row);}}>Cập nhật</Button><Tooltip title="Xóa đơn"><Button aria-label="Xóa đơn" danger icon={<DeleteOutlined />} disabled={busy || !['DaGiao', 'DaHuy'].includes(row.trang_thai)} onClick={() => modal.confirm({ title: `Xóa đơn #${row.ma_don_hang}?`, content: 'Chỉ xóa đơn đã giao hoặc đã hủy. Không thể khôi phục dữ liệu.', okText: 'Xóa', cancelText: 'Hủy', okButtonProps: { danger: true }, onOk: () => run(() => orderApi.remove(row.ma_don_hang), 'Đã xóa đơn hàng') })} /></Tooltip></Space> },
    ]} /></div><Modal title={`Cập nhật đơn #${editingOrder?.ma_don_hang || ''}`} open={!!editingOrder} onCancel={() => {if(!busy)setEditingOrder(null);}} onOk={() => statusForm.submit()} confirmLoading={busy} cancelButtonProps={{disabled:busy}} okText="Xác nhận" cancelText="Hủy" width={560}>
      <p className="modal-description">Kiểm tra bước xử lý tiếp theo trước khi lưu thay đổi.</p>
      <div className="order-status-summary"><span>Trạng thái hiện tại</span>{editingOrder && <Status value={editingOrder.trang_thai} />}</div>
      <Form form={statusForm} layout="vertical" disabled={busy} onFinish={async ({trang_thai}) => {if(!editingOrder)return;try{await run(() => orderApi.status(editingOrder.ma_don_hang,trang_thai),'Đã cập nhật trạng thái');setEditingOrder(null);}catch{/* Keep the popup open for retry. */}}}>
        <Form.Item name="trang_thai" label="Trạng thái mới" rules={[{required:true,message:'Chọn trạng thái tiếp theo'}]}><Select aria-label={`Đổi trạng thái đơn ${editingOrder?.ma_don_hang || ''}`} placeholder="Chọn trạng thái" options={options(editingOrder ? transitions[editingOrder.trang_thai] || [] : [])} /></Form.Item>
      </Form>{nextStatus === 'DaHuy' && <Alert showIcon type="warning" message="Hàng trong đơn sẽ được hoàn lại tồn kho khi hủy đơn." />}
    </Modal><Drawer title={`Đơn hàng #${detail?.ma_don_hang || ''}`} open={!!detail} onClose={() => setDetail(null)} width={Math.min(800, window.innerWidth)}>{detail && <><Button onClick={()=>{try{printOrder(detail);}catch(e){message.error(errorMessage(e));}}}>In / PDF</Button><Descriptions column={1} bordered items={[
      ['Tài khoản đặt', detail.ten_dang_nhap || String(detail.ma_tai_khoan)], ['Nhân viên xác nhận đơn', confirmationLabel(detail)], ['Ngày xác nhận', detail.ngay_xac_nhan ? dateTime(detail.ngay_xac_nhan) : '—'], ['Người nhận', detail.ho_ten_nguoi_nhan], ['Điện thoại', detail.so_dien_thoai], ['Địa chỉ', detail.dia_chi_giao_hang], ['Ngày đặt', dateTime(detail.ngay_dat)], ['Thanh toán', labels[detail.phuong_thuc_thanh_toan]], ['Trạng thái', labels[detail.trang_thai]], ['Ghi chú', detail.ghi_chu],
      ['Tiền hàng', money(detail.tam_tinh ?? Number(detail.tong_tien) + Number(detail.giam_gia || 0) - Number(detail.phi_giao_hang || 0))],
      ['Mã giảm giá', detail.ma_code || (detail.ma_voucher ? `Voucher #${detail.ma_voucher}` : 'Không áp dụng')],
      ['Giảm giá', money(detail.giam_gia || 0)], ['Phí giao hàng', money(detail.phi_giao_hang || 0)], ['Tổng thanh toán', money(detail.tong_tien)],
    ].map(([label, children]) => ({ key: String(label), label, children: children || '—' }))} />
    <h3 className="mt">Sản phẩm đã đặt</h3>
    {detail.trang_thai === 'DangGiao' ? <p style={{color:'#126b60'}}>Đang chờ khách hàng xác nhận đã nhận hàng trên ứng dụng. Đơn sẽ chuyển sang Đã giao sau khi khách xác nhận.</p> : null}
    <Table<OrderItem> key={detail.ma_don_hang} rowKey={row=>`${row.ma_san_pham}:${row.ma_bien_the || 0}`} dataSource={detail.items || []} pagination={false} scroll={{ x: 650 }}
      expandable={{ expandedRowRender: row => <OrderedProductDetails item={row} />, columnWidth: 150,
        expandIcon: ({ expanded, onExpand, record }) => <Button type="link" size="small" aria-expanded={expanded} onClick={event => onExpand(record, event)}>{expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết sản phẩm'}</Button> }}
      columns={[
        { title: 'Sản phẩm', render: (_, row) => <Space align="start">{row.hinh_anh ? <Image src={row.hinh_anh} alt={row.ten_san_pham} width={48} height={48} style={{objectFit:'contain',borderRadius:8}} /> : <span style={{color:'#84938B'}}>Không có ảnh</span>}<span>{row.ten_san_pham}</span></Space> },
        { title: 'Biến thể', dataIndex: 'ten_bien_the', render: value => value || 'Tiêu chuẩn' },
        { title: 'Số lượng', dataIndex: 'so_luong' }, { title: 'Đơn giá', dataIndex: 'don_gia', render: money },
        { title: 'Thành tiền', render: (_,row) => money(row.thanh_tien ?? Number(row.don_gia)*row.so_luong) },
      ]} /></>}</Drawer></>;
}

function OrderedProductDetails({ item }: { item: OrderItem }) {
  const details = item.product_details;
  return <div style={{padding:16,background:'#fff',borderRadius:12}}>
    <h4 style={{marginTop:0}}>Thông tin sản phẩm đã đặt</h4>
    <Descriptions size="small" column={1} bordered items={[
      {key:'name',label:'Sản phẩm',children:item.ten_san_pham},
      {key:'variant',label:'Biến thể',children:item.ten_bien_the || 'Tiêu chuẩn'},
      {key:'quantity',label:'Số lượng',children:item.so_luong},
      {key:'price',label:'Đơn giá khi đặt',children:money(item.don_gia)},
      {key:'total',label:'Thành tiền',children:money(item.thanh_tien ?? Number(item.don_gia)*item.so_luong)},
    ]} />
    {details ? <>
      <h4>Thông tin danh mục hiện tại</h4>
      <Descriptions size="small" column={1} bordered items={[
        {key:'code',label:'Mã sản phẩm',children:details.ma_san_pham_code || '—'},
        {key:'sku',label:'SKU biến thể',children:details.ma_sku || '—'},
        {key:'category',label:'Danh mục',children:details.ten_danh_muc || '—'},
        {key:'brand',label:'Thương hiệu',children:details.ten_thuong_hieu || '—'},
        {key:'warranty',label:'Bảo hành',children:details.bao_hanh == null ? '—' : `${details.bao_hanh} tháng`},
      ]} />
      <h4>Thông số hiện tại của sản phẩm / biến thể</h4>
      {details.thong_so_ky_thuat.length ? <Descriptions size="small" column={1} bordered items={details.thong_so_ky_thuat.map(spec=>({key:String(spec.ma_thong_so),label:spec.ten_thong_so,children:spec.gia_tri}))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông số kỹ thuật" />}
    </> : <p>Sản phẩm không còn trong danh mục. Thông tin đã đặt vẫn được giữ trong đơn hàng.</p>}
  </div>;
}
