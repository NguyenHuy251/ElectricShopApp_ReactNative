import { expect, test } from '@playwright/test';

test('the mobile dock navigates to all four tabs and fits a narrow phone', async ({ page }, testInfo) => {
  const url = process.env.MOBILE_TEST_URL;
  test.skip(!url, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const customer = { ma_tai_khoan: 7, ho_ten: 'Khách kiểm thử', vai_tro: 'KhachHang' };
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'tabs-fixture');
    localStorage.setItem('user', JSON.stringify(user));
  }, customer);
  await page.route('**/api/**', (route) => {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith('/api/')) return route.fallback();
    if (pathname === '/api/auth/me') return route.fulfill({ json: { data: customer } });
    if (pathname === '/api/gio-hang') return route.fulfill({ json: { data: { items: [] } } });
    if (pathname.endsWith('/unread') || pathname.endsWith('/unread-count')) {
      return route.fulfill({ json: { data: { count: 0 } } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url!);
  const dock = page.getByRole('tablist').filter({ has: page.getByRole('tab', { name: 'Trang chủ', exact: true }) });
  const home = dock.getByRole('tab', { name: 'Trang chủ', exact: true });
  await expect(home).toHaveAttribute('aria-selected', 'true', { timeout: 30000 });
  await expect(dock.getByRole('tab')).toHaveCount(4);
  for (const [label, path] of [['Sản phẩm', 'products'], ['Giỏ hàng', 'cart'], ['Tài khoản', 'profile']]) {
    const tab = dock.getByRole('tab', { name: label, exact: true });
    await expect(tab).toBeInViewport({ ratio: 1 });
    await tab.click();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
    await expect(dock.getByRole('tab', { selected: true })).toHaveAccessibleName(label);
  }

  await home.focus();
  await home.press('Enter');
  await expect(page).toHaveURL(new URL('/', url!).href);
  await expect(home).toHaveAttribute('aria-selected', 'true');
  await expect(dock).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('mobile-dock.png') });

  await page.setViewportSize({ width: 820, height: 1000 });
  const bounds = await dock.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(460);
  expect(Math.abs(bounds!.x + bounds!.width / 2 - 410)).toBeLessThan(2);
  expect(errors).toEqual([]);
});
