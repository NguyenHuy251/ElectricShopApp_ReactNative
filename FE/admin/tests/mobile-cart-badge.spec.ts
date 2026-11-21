import { expect, test } from '@playwright/test';

test('cart tab counts product variants once and updates as the cart changes', async ({ page }) => {
  const baseUrl = process.env.MOBILE_TEST_URL;
  test.skip(!baseUrl, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const customer = {
    ma_tai_khoan: 7, ho_ten: 'Khách kiểm thử', vai_tro: 'KhachHang',
    so_dien_thoai: '0912345678', dia_chi: '12 Nguyễn Trãi, Hà Nội',
  };
  await page.addInitScript(user => {
    localStorage.setItem('token', 'cart-badge-fixture');
    localStorage.setItem('user', JSON.stringify(user));
  }, customer);

  const riceCooker = { ma_san_pham: 11, ten_san_pham: 'Nồi cơm điện', gia_ban: 500000, ton_kho: 10, trang_thai: 'DangBan' };
  const speaker = { ma_san_pham: 13, ten_san_pham: 'Loa Bluetooth', gia_ban: 400000, so_luong: 10, trang_thai: 'DangBan' };
  const items = [
    { ...riceCooker, ma_bien_the: 21, ten_bien_the: 'Đỏ', so_luong: 3 },
    { ...riceCooker, ma_bien_the: 22, ten_bien_the: 'Trắng', so_luong: 2 },
  ];
  let addedQuantity = 0;
  let cartReads = 0;

  await page.route('**/api/**', route => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (!pathname.startsWith('/api/')) return route.fallback();
    const send = (data: unknown) => route.fulfill({ json: { data } });
    if (pathname === '/api/auth/me') return send(customer);
    if (pathname === '/api/san-pham') return send([speaker]);
    if (pathname === '/api/san-pham/13') return send(speaker);
    if (pathname === '/api/gio-hang' && request.method() === 'GET') {
      cartReads++;
      return send({ items: addedQuantity ? [...items, { ...speaker, so_luong: addedQuantity, ton_kho: 10 }] : items });
    }
    if (pathname === '/api/gio-hang' && request.method() === 'POST') {
      addedQuantity += request.postDataJSON().so_luong;
      return send(null);
    }
    if (pathname === '/api/gio-hang/13') {
      addedQuantity = request.method() === 'DELETE' ? 0 : request.postDataJSON().so_luong;
      return send(null);
    }
    if (pathname === '/api/don-hang/checkout') return send({
      items, tam_tinh: 2500000, giam_gia: 0, phi_giao_hang: 0, tong_tien: 2500000,
      issues: [], can_checkout: true, snapshot: 'cart-badge-test',
    });
    if (pathname === '/api/don-hang' && request.method() === 'POST') {
      items.length = 0;
      return send({ ma_don_hang: 42 });
    }
    if (pathname === '/api/don-hang/42') return send({ ma_don_hang: 42, trang_thai: 'ChoXacNhan', tong_tien: 2500000 });
    return send([]);
  });

  await page.goto(baseUrl!);
  const cartTab = page.getByRole('tab', { name: 'Giỏ hàng', exact: true });
  const count = (value: string) => cartTab.getByText(value, { exact: true });
  await expect(count('2')).toBeVisible({ timeout: 30000 });
  await expect(count('2').locator('..')).toHaveCSS('background-color', 'rgb(220, 38, 38)');
  expect(cartReads).toBe(1);

  await page.getByRole('link', { name: 'Xem Loa Bluetooth', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  await expect(page.getByText('Đã thêm 1 sản phẩm vào giỏ hàng.', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(count('3')).toBeVisible();
  await page.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sổ địa chỉ', exact: true })).toBeVisible();
  await expect(page.getByText('Giỏ hàng', { exact: true })).toHaveCount(1);

  await cartTab.click();
  await page.getByRole('button', { name: 'Tăng số lượng Loa Bluetooth', exact: true }).click();
  await expect(page.getByText('Tạm tính (7 sản phẩm)', { exact: true })).toBeVisible();
  await expect(count('3')).toBeVisible();
  await page.getByRole('button', { name: 'Xóa Loa Bluetooth', exact: true }).click();
  await expect(count('2')).toBeVisible();

  await page.getByRole('button', { name: 'Tiến hành thanh toán' }).click();
  await page.getByRole('button', { name: 'Kiểm tra đơn hàng' }).click();
  await page.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }).click();
  await page.getByRole('button', { name: 'Xác nhận đặt hàng COD' }).click();
  await page.getByRole('button', { name: 'Tiếp tục mua sắm' }).click();
  await expect(cartTab).toBeVisible();
  await expect(cartTab.getByText(/^\d+\+?$/)).toHaveCount(0);
});
