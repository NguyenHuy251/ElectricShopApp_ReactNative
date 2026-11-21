import { expect, test } from '@playwright/test';

test('all four tabs share the header actions and remember the appearance preference', async ({ page }, testInfo) => {
  const baseUrl = process.env.MOBILE_TEST_URL;
  test.skip(!baseUrl, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  const user = { ma_tai_khoan: 7, ho_ten: 'Khách kiểm thử', vai_tro: 'KhachHang' };
  await page.addInitScript((customer) => {
    localStorage.setItem('token', 'appearance-fixture');
    localStorage.setItem('user', JSON.stringify(customer));
  }, user);
  await page.route('**/api/**', (route) => {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith('/api/')) return route.fallback();
    if (pathname === '/api/auth/me') return route.fulfill({ json: { data: user } });
    if (pathname.endsWith('/unread-count') || pathname.endsWith('/unread')) {
      return route.fulfill({ json: { data: { count: 2 } } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('/profile', baseUrl).href);
  const darkButton = page.getByRole('button', { name: 'Bật giao diện tối' });
  const lightButton = page.getByRole('button', { name: 'Bật giao diện sáng' });
  const bell = page.getByRole('link', { name: 'Mở thông báo, 4 cập nhật chưa đọc', exact: true });
  const badge = bell.getByText('4', { exact: true }).locator('..');
  const greeting = page.getByRole('heading', { name: 'Xin chào, bạn!' });
  await expect(darkButton).toBeInViewport({ ratio: 1, timeout: 30000 });
  await expect(bell).toBeInViewport({ ratio: 1 });
  await expect(badge).toHaveCSS('background-color', 'rgb(220, 38, 38)');
  expect((await darkButton.boundingBox())!.x).toBeLessThan((await bell.boundingBox())!.x);
  await expect(greeting).toHaveCSS('color', 'rgb(23, 43, 42)');
  const coin = page.getByTestId('wallet-coin');
  await expect(coin).toHaveCSS('color', 'rgb(152, 96, 26)');
  await expect(coin.locator('..')).toHaveCSS('background-color', 'rgb(255, 242, 232)');
  await page.screenshot({ path: testInfo.outputPath('wallet-light.png') });

  const dock = page.getByRole('tablist');
  const position = (await bell.boundingBox())!;
  for (const [tab, path] of [['Trang chủ', '/'], ['Giỏ hàng', '/cart'], ['Sản phẩm', '/products']]) {
    await dock.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page).toHaveURL(new URL(path, baseUrl).href);
    await expect(darkButton).toBeInViewport({ ratio: 1 });
    await expect(bell).toBeInViewport({ ratio: 1 });
    await expect(darkButton).toHaveCount(1);
    await expect(bell).toHaveCount(1);
    await expect(badge).toHaveCSS('background-color', 'rgb(220, 38, 38)');
    const box = (await bell.boundingBox())!;
    expect(Math.abs(box.x - position.x)).toBeLessThan(1);
    expect(Math.abs(box.y - position.y)).toBeLessThan(1);
  }

  await darkButton.click();
  await expect(lightButton).toBeVisible();
  await dock.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
  await expect(lightButton).toBeVisible();
  await expect(greeting).toHaveCSS('color', 'rgb(240, 246, 242)');
  await expect(bell).toHaveCSS('background-color', 'rgb(25, 37, 34)');
  await expect(badge).toHaveCSS('background-color', 'rgb(220, 38, 38)');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(16, 25, 23)');
  await page.screenshot({ path: testInfo.outputPath('profile-dark.png') });

  await bell.click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByText('Cập nhật dành cho bạn', { exact: true })).toHaveCSS('color', 'rgb(240, 246, 242)');
  await page.goBack();
  await expect(lightButton).toBeVisible();
  await page.reload();
  await expect(lightButton).toBeVisible();
  await expect(greeting).toHaveCSS('color', 'rgb(240, 246, 242)');

  await lightButton.click();
  await expect(darkButton).toBeVisible();
  await expect(greeting).toHaveCSS('color', 'rgb(23, 43, 42)');
  await page.reload();
  await expect(darkButton).toBeVisible();
  expect(errors).toEqual([]);
});
