import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures';

test('Strict Mode mounts fetch product lists and references only once', async ({ page }) => {
  const mock = await mockApi(page);
  await page.goto('/products');
  await expect(page.getByRole('cell', { name: 'Nồi cơm điện' })).toBeVisible();
  for (const resource of ['san-pham', 'danh-muc', 'thuong-hieu']) {
    expect(mock.requests.filter(request => request.resource === resource && request.method === 'GET')).toHaveLength(1);
  }
  expect(mock.requests.filter(request => request.resource === 'auth')).toHaveLength(1);
  await page.getByRole('link', { name: 'Đơn hàng', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Người nhận mẫu', exact: true })).toBeVisible();
  expect(mock.requests.filter(request => request.path === '/api/don-hang')).toHaveLength(1);
  await page.getByRole('link', { name: 'Nhân viên', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Nhân viên mẫu', exact: true })).toBeVisible();
  for (const resource of ['nhan-vien', 'permissions', 'tai-khoan']) {
    expect(mock.requests.filter(request => request.resource === resource)).toHaveLength(1);
  }
});

test('voucher navigation never fetches catalog data', async ({ page }) => {
  const mock = await mockApi(page, 'NhanVien', true, ['vouchers']);
  await page.route('**/api/shop/vouchers', route => route.fulfill({ json: { success: true, data: [] } }));
  await page.goto('/vouchers');
  await expect(page.getByRole('button', { name: 'Thêm mã giảm giá' })).toBeVisible();
  expect(mock.requests.filter(request => request.resource === 'san-pham')).toHaveLength(0);
  expect(mock.requests.filter(request => request.path.endsWith('/pending-count'))).toHaveLength(0);
  await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập trang này' })).toHaveCount(0);
});

test('review autocomplete batches rapid typing into one API search', async ({ page }) => {
  const mock = await mockApi(page);
  await page.goto('/reviews');
  await expect(page.getByRole('cell', { name: 'Sản phẩm tốt', exact: true })).toBeVisible();
  const initial = mock.requests.filter(request => request.resource === 'san-pham').length;
  await page.getByRole('combobox', { name: 'Chọn sản phẩm' }).pressSequentially('rice', { delay: 25 });
  await expect.poll(() => mock.requests.filter(request => request.resource === 'san-pham').length).toBe(initial + 1);
  const requests = mock.requests.filter(request => request.resource === 'san-pham');
  expect(new URLSearchParams(requests.at(-1)!.search).get('search')).toBe('rice');
});

test('specification page loads shared data once under Strict Mode', async ({ page }) => {
  const mock = await mockApi(page);
  const specRequests: string[] = [];
  await page.route('**/api/thong-so**', route => {
    specRequests.push(new URL(route.request().url()).pathname);
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto('/category-specifications');
  await expect(page.getByRole('heading', { name: 'Quản lý Danh mục Thông số Kỹ thuật' })).toBeVisible();
  await expect.poll(() => mock.requests.filter(request => request.resource === 'danh-muc').length).toBe(2);
  expect(specRequests.filter(path => path === '/api/thong-so/nhom')).toHaveLength(1);
  expect(specRequests.filter(path => path === '/api/thong-so')).toHaveLength(1);
});
