import { expect, test } from '@playwright/test';

test('checkout makes vouchers easy to find, apply and remove', async ({ page }, testInfo) => {
  const baseUrl = process.env.MOBILE_TEST_URL;
  test.skip(!baseUrl, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  const user = {
    ma_tai_khoan: 7, ho_ten: 'Khách kiểm thử', vai_tro: 'KhachHang',
    so_dien_thoai: '0912345678', dia_chi: '12 Lê Lợi, Phường Sài Gòn, TP.HCM',
  };
  await page.addInitScript(customer => {
    localStorage.setItem('token', 'checkout-voucher-fixture');
    localStorage.setItem('user', JSON.stringify(customer));
  }, user);

  const voucher = {
    ma_voucher: 1, ma_code: 'SAVE50', giam_tien: 50000, loai: 'SoTien',
    giam_toi_da: null, don_toi_thieu: 300000, ket_thuc: '2030-01-01', co_the_dung: true, ly_do: '',
  };
  const voucherSubtotals: (string | null)[] = [];
  await page.route('**/api/**', route => {
    const { pathname, searchParams } = new URL(route.request().url());
    if (!pathname.startsWith('/api/')) return route.fallback();
    if (pathname === '/api/auth/me') return route.fulfill({ json: { data: user } });
    if (pathname === '/api/shop/my-vouchers') {
      voucherSubtotals.push(searchParams.get('tam_tinh'));
      return route.fulfill({ json: { data: [
        { ...voucher, ma_voucher: 2, ma_code: 'MINIMUM', don_toi_thieu: 900000, co_the_dung: false, ly_do: 'Chưa đạt giá trị đơn tối thiểu.' },
        voucher,
      ] } });
    }
    if (pathname === '/api/don-hang/checkout') {
      const code = searchParams.get('ma_code') || '';
      if (code && code !== voucher.ma_code) return route.fulfill({ status: 409, json: { message: 'Mã giảm giá không tồn tại.' } });
      const discount = code ? voucher.giam_tien : 0;
      return route.fulfill({ json: { data: {
        items: [{ ma_san_pham: 7, ten_san_pham: 'Loa Bluetooth', gia_ban: 500000, so_luong: 1 }],
        tam_tinh: 500000, giam_gia: discount, phi_giao_hang: 0, tong_tien: 500000 - discount,
        issues: [], can_checkout: true, ma_code: code, snapshot: `quote-${code}`,
      } } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto(new URL('/checkout', baseUrl).href);
  const heading = page.getByRole('heading', { name: 'Voucher & mã giảm giá' });
  const picker = page.getByRole('button', { name: 'Chọn voucher', exact: true });
  const collapse = page.getByRole('button', { name: 'Ẩn danh sách voucher', exact: true });
  const input = page.getByRole('textbox', { name: 'Mã giảm giá', exact: true });
  const apply = page.getByRole('button', { name: 'Áp dụng mã', exact: true });
  const remove = page.getByRole('button', { name: 'Bỏ mã giảm giá' });
  const savings = page.getByText('Tiết kiệm 50.000đ', { exact: true });
  await expect(heading).toBeVisible({ timeout: 30000 });
  await expect(apply).toBeDisabled();
  await expect(picker.getByText('Chọn voucher', { exact: true })).toBeVisible();
  await picker.click();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(collapse.getByText('Ẩn danh sách voucher', { exact: true })).toBeVisible();
  const eligible = page.getByRole('button', { name: 'Chọn voucher SAVE50' });
  const ineligible = page.getByRole('button', { name: 'Chọn voucher MINIMUM' });
  await expect(ineligible).toBeDisabled();
  expect(voucherSubtotals).toEqual(['500000']);
  await expect(page.getByText('Chưa đạt giá trị đơn tối thiểu.')).toBeVisible();
  expect((await eligible.boundingBox())!.y).toBeLessThan((await ineligible.boundingBox())!.y);
  await collapse.screenshot({ path: testInfo.outputPath('checkout-voucher-expanded.png') });
  await collapse.click();
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await expect(eligible).toHaveCount(0);
  await picker.click();
  await eligible.click();
  await expect(page.getByRole('button', { name: 'Đổi voucher' })).toHaveAttribute('aria-expanded', 'false');
  await expect(savings).toBeVisible();
  await expect(page.getByText('450.000đ', { exact: true })).toBeVisible();
  await heading.scrollIntoViewIfNeeded();
  await heading.locator('..').screenshot({ path: testInfo.outputPath('checkout-voucher-light.png') });

  await remove.click();
  await expect(picker).toBeVisible();
  await expect(savings).toHaveCount(0);
  await expect(input).toBeEmpty();
  await input.fill('INVALID');
  await apply.click();
  await expect(heading.locator('..').getByRole('alert')).toHaveText('Mã giảm giá không tồn tại.');
  await input.fill('save50');
  await apply.click();
  await expect(input).toHaveValue('SAVE50');
  await expect(savings).toBeVisible();

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await expect(heading).toHaveCSS('color', 'rgb(240, 246, 242)');
  await heading.locator('..').screenshot({ path: testInfo.outputPath('checkout-voucher-dark.png') });
  await page.getByRole('button', { name: 'Kiểm tra đơn hàng' }).click();
  await expect(page.getByText('Kiểm tra lần cuối')).toBeVisible();
  await expect(savings).toBeVisible();
  await expect(remove).toHaveCount(0);
});
