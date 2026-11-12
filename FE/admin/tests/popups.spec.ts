import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './fixtures';

async function operations(page: Page) {
  const requests: {method:string;path:string;body:any}[] = [];
  const vouchers = [{ma_voucher:1,ma_code:'WELCOME',giam_tien:50000,don_toi_thieu:0,so_luot:100,da_dung:2,trang_thai:false,ket_thuc:'2027-01-01'}];
  const inventory: any[] = [];
  await page.route('**/api/shop/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const body = route.request().postDataJSON();
    requests.push({method,path,body});
    if (method === 'POST' && path.endsWith('/inventory')) inventory.push({...body,ma_nhap:1,ten_san_pham:'Nồi cơm điện',ho_ten:'Quản trị'});
    if (method === 'POST' && path.endsWith('/vouchers')) vouchers.push({...body,ma_voucher:2,da_dung:0,trang_thai:true});
    if (method === 'PUT') Object.assign(vouchers.find(v=>path.endsWith(`/${v.ma_voucher}`)) || {},body);
    await route.fulfill({json:{success:true,data:path.includes('vouchers') ? vouchers : inventory}});
  });
  return requests;
}

test('inventory creation is a popup; cancellation does not save and submission preserves the payload', async ({page}) => {
  await mockApi(page); const requests = await operations(page);
  await page.goto('/inventory');
  await expect(page.getByLabel('Số lượng nhập')).toHaveCount(0);
  await page.getByRole('button',{name:'Tạo phiếu nhập',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Số lượng nhập')).toBeVisible();
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  expect(requests.filter(r=>r.method==='POST')).toHaveLength(0);
  await page.getByRole('button',{name:'Tạo phiếu nhập',exact:true}).click();
  await dialog.getByLabel('Sản phẩm',{exact:true}).click();
  await page.locator('.ant-select-dropdown:visible').getByTitle('Nồi cơm điện',{exact:true}).click();
  await dialog.getByLabel('Số lượng nhập').fill('2');
  await dialog.getByLabel('Ghi chú').fill('Kiểm tra popup');
  await dialog.getByRole('button',{name:'Lưu',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(requests.find(r=>r.method==='POST')?.body).toEqual({ma_san_pham:7,so_luong:2,ghi_chu:'Kiểm tra popup'});
  await expect(page.getByRole('cell',{name:'Nồi cơm điện',exact:true})).toBeVisible();
});

test('voucher creation and status changes are explicit popup submissions', async ({page}) => {
  await mockApi(page); const requests = await operations(page);
  await page.goto('/vouchers');
  await page.getByRole('button',{name:'Thêm mã giảm giá',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Mã giảm giá',{exact:true}).fill('SUMMER');
  await dialog.getByLabel('Số tiền giảm (đ)',{exact:true}).fill('20000');
  await dialog.getByLabel('Tổng lượt sử dụng',{exact:true}).fill('10');
  await dialog.getByLabel('Bắt đầu',{exact:true}).fill('2026-11-12T09:00');
  await dialog.getByLabel('Kết thúc',{exact:true}).fill('2027-01-01T09:00');
  await dialog.getByRole('button',{name:'Lưu',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(requests.find(r=>r.method==='POST')?.body.ma_code).toBe('SUMMER');
  await page.getByRole('button',{name:'Sửa voucher WELCOME',exact:true}).click();
  await dialog.getByRole('switch').click();
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  expect(requests.filter(r=>r.method==='PUT')).toHaveLength(0);
  await page.getByRole('button',{name:'Sửa voucher WELCOME',exact:true}).click();
  await expect(dialog.getByRole('switch')).not.toBeChecked();
  await dialog.getByRole('switch').click();
  await dialog.getByRole('button',{name:'Lưu',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(requests.find(r=>r.method==='PUT')?.body).toEqual({trang_thai:true});
});

test('profile and password editors open in popups and cancellation discards unsaved input', async ({page}) => {
  const mock = await mockApi(page);
  await page.goto('/account');
  await expect(page.getByLabel('Họ tên',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Họ tên',{exact:true})).toHaveValue('Quản trị');
  await dialog.getByLabel('Họ tên',{exact:true}).fill('Chưa lưu');
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  expect(mock.requests.filter(r=>r.method==='PUT')).toHaveLength(0);
  await page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();
  await expect(dialog.getByLabel('Họ tên',{exact:true})).toHaveValue('Quản trị');
  await dialog.getByLabel('Email',{exact:true}).fill('updated@example.test');
  await dialog.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(mock.requests.find(r=>r.method==='PUT')?.body.email).toBe('updated@example.test');
  await page.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();
  await dialog.getByLabel('Mật khẩu hiện tại',{exact:true}).fill('old-password');
  await dialog.getByLabel('Mật khẩu mới',{exact:true}).fill('new-password');
  await dialog.getByLabel('Nhập lại mật khẩu mới',{exact:true}).fill('different-password');
  await dialog.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();
  await expect(dialog.getByText('Mật khẩu không khớp',{exact:true})).toBeVisible();
  expect(mock.requests.filter(r=>r.method==='PUT')).toHaveLength(1);
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
});

test('order status popup validates selection and cancellation never updates the order', async ({page}) => {
  const mock = await mockApi(page);
  await page.goto('/orders');
  await page.getByRole('button',{name:'Cập nhật đơn 10',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Xác nhận',exact:true}).click();
  await expect(dialog.getByText('Chọn trạng thái tiếp theo',{exact:true})).toBeVisible();
  await dialog.getByRole('combobox').click();
  await page.locator('.ant-select-dropdown:visible').getByTitle('Đã hủy',{exact:true}).click();
  await expect(dialog.getByText(/hoàn lại tồn kho/)).toBeVisible();
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  expect(mock.requests.filter(r=>r.method==='PUT')).toHaveLength(0);
});

test('popup footer stays reachable on short screens and Escape restores focus to its trigger', async ({page}) => {
  await page.setViewportSize({width:1280,height:395});
  await mockApi(page); await operations(page);
  await page.goto('/vouchers');
  const trigger = page.getByRole('button',{name:'Thêm mã giảm giá',exact:true});
  await trigger.click();
  const dialog = page.getByRole('dialog');
  const footer = await dialog.getByRole('button',{name:'Lưu',exact:true}).boundingBox();
  expect(footer!.y).toBeGreaterThanOrEqual(0);
  expect(footer!.y+footer!.height).toBeLessThanOrEqual(395);
  await dialog.getByLabel('Mã giảm giá',{exact:true}).focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('saving an inventory error retains the popup and entered values for retry', async ({page}) => {
  await mockApi(page); const requests = await operations(page);
  let posts = 0;
  await page.route('**/api/shop/inventory',route => {
    if(route.request().method() !== 'POST')return route.fallback();
    posts++;
    return route.fulfill({status:503,json:{message:'Chưa lưu được phiếu nhập'}});
  });
  await page.goto('/inventory');
  await page.getByRole('button',{name:'Tạo phiếu nhập',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Sản phẩm',{exact:true}).click();
  await page.locator('.ant-select-dropdown:visible').getByTitle('Nồi cơm điện',{exact:true}).click();
  await dialog.getByLabel('Số lượng nhập').fill('3');
  await dialog.getByRole('button',{name:'Lưu',exact:true}).click();
  await expect(page.getByText('Chưa lưu được phiếu nhập',{exact:true})).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Số lượng nhập')).toHaveValue('3');
  expect(posts).toBe(1);
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  expect(requests.filter(r=>r.method==='POST')).toHaveLength(0);
});

test('category requirement changes use the existing edit popup instead of an inline switch', async ({page}) => {
  const mock = await mockApi(page);
  await page.route('**/api/thong-so**',route=>route.fulfill({json:{success:true,data:[]}}));
  await page.goto('/category-specifications');
  await expect(page.getByRole('cell',{name:'Công suất',exact:true})).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0);
  await page.getByRole('button',{name:'Sửa cấu hình thông số',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('switch')).toBeVisible();
  await dialog.getByRole('switch').click();
  await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  expect(mock.requests.filter(r=>r.method==='PUT')).toHaveLength(0);
});
