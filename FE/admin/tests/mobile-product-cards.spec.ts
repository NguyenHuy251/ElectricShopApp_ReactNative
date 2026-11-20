import { expect, test, type Locator } from '@playwright/test';

test('mobile listings keep two readable product cards per row and open product details', async ({ page }) => {
  const baseUrl = process.env.MOBILE_TEST_URL;
  test.skip(!baseUrl, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  const user = { ma_tai_khoan: 7, ho_ten: 'Khách kiểm thử', vai_tro: 'KhachHang' };
  await page.addInitScript(customer => {
    localStorage.setItem('token', 'product-fixture');
    localStorage.setItem('user', JSON.stringify(customer));
  }, user);

  const first = {
    ma_san_pham: 11, ten_san_pham: 'Máy lọc không khí cho phòng khách', ma_san_pham_code: 'LOC11',
    ma_danh_muc: 1, ten_danh_muc: 'Điện gia dụng', ten_thuong_hieu: 'Electro',
    gia_ban: 1290000, bao_hanh: 24, diem_danh_gia: 4.8, so_luong_danh_gia: 15,
    so_luong: 9, so_luong_da_ban: 1250, trang_thai: 'DangBan',
  };
  const second = {
    ...first, ma_san_pham: 12, ten_san_pham: 'Loa Bluetooth', gia_ban: 490000,
    trang_thai: 'HetHang', diem_danh_gia: null, so_luong_danh_gia: 0, so_luong_da_ban: 0,
    hinh_anh: new URL('/product-fixture-failed.png', baseUrl).href,
  };
  const third = { ...first, ma_san_pham: 13, ten_san_pham: 'Nồi cơm điện', trang_thai: 'DangBan', bao_hanh: 0 };
  const fourth = { ...first, ma_san_pham: 14, ten_san_pham: 'Ấm siêu tốc', trang_thai: 'DangBan' };
  const products = [first, second, third, fourth];
  await page.route('**/product-fixture-failed.png', route => route.fulfill({ status: 404 }));
  await page.route('**/api/**', route => {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith('/api/')) return route.fallback();
    if (pathname === '/api/auth/me') return route.fulfill({ json: { data: user } });
    if (pathname === '/api/san-pham') return route.fulfill({ json: { data: products, pagination: { total: 4, totalPages: 1 } } });
    if (pathname === '/api/san-pham/11') return route.fulfill({ json: { data: first } });
    return route.fulfill({ json: { data: [] } });
  });

  const card = (name: string) => page.getByRole('link', { name: `Xem ${name}`, exact: true });
  const expectTwoColumns = async (left: Locator, right: Locator) => {
    await expect(left).toBeVisible({ timeout: 30000 });
    await expect(right).toBeVisible();
    const firstBounds = await left.boundingBox();
    const secondBounds = await right.boundingBox();
    expect(firstBounds!.y).toBeCloseTo(secondBounds!.y, 0);
    expect(firstBounds!.width).toBeCloseTo(secondBounds!.width, 0);
    expect(secondBounds!.x).toBeGreaterThan(firstBounds!.x + firstBounds!.width);
    expect(secondBounds!.x + secondBounds!.width).toBeLessThanOrEqual(320);
  };

  await page.goto(baseUrl!);
  const firstCard = card(first.ten_san_pham);
  const secondCard = card(second.ten_san_pham);
  await expectTwoColumns(firstCard, secondCard);
  await expect(firstCard.getByText('Bảo hành 24 tháng', { exact: true })).toBeVisible();
  await expect(firstCard.getByText('1.290.000đ', { exact: true })).toBeVisible();
  await expect(firstCard.getByText('4,8', { exact: true })).toBeVisible();
  await expect(firstCard.getByText('Đã bán 1.250', { exact: true })).toBeVisible();
  await expect(secondCard.getByText('Hết hàng', { exact: true })).toBeVisible();
  await expect(secondCard.getByText('Chưa đánh giá', { exact: true })).toBeVisible();
  await expect(secondCard.getByText('Đã bán 0', { exact: true })).toBeVisible();
  await expect(secondCard.getByText('Electric Shop', { exact: true })).toBeVisible();
  await expect(card(third.ten_san_pham).getByText('Có sẵn', { exact: true })).toBeVisible();

  await page.goto(new URL('/products', baseUrl).href);
  await expectTwoColumns(firstCard, secondCard);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await expect(firstCard.getByText('1.290.000đ', { exact: true })).toHaveCSS('color', 'rgb(255, 173, 136)');
  await firstCard.click({ timeout: 10000 });
  await expect(page).toHaveURL(/\/product\/11$/);
  await expect(page.getByText('4.8/5 (15 đánh giá)', { exact: true })).toBeVisible();
  const related = page.getByText('Cùng danh mục', { exact: true }).locator('..');
  await expectTwoColumns(
    related.getByRole('link', { name: `Xem ${third.ten_san_pham}`, exact: true }),
    related.getByRole('link', { name: `Xem ${fourth.ten_san_pham}`, exact: true }),
  );
});
