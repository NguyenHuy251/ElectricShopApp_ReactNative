import { test, expect } from '@playwright/test';

// Start Expo web separately, then set MOBILE_TEST_URL to its URL.
// Viewport resizing covers layout/scrolling; a device is still required for native keyboard animation.
test('mobile inbox keeps the draft, send button and newest message visible when space shrinks', async ({
  page,
}) => {
  test.skip(!process.env.MOBILE_TEST_URL, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'inbox-layout-fixture');
    localStorage.setItem(
      'user',
      JSON.stringify({ ma_tai_khoan: 7, vai_tro: 'KhachHang' }),
    );
  });
  const messages = Array.from({ length: 40 }, (_, i) => ({
    ma_tin_nhan: String(i + 1),
    ben_gui: i % 2 ? 'CuaHang' : 'KhachHang',
    noi_dung: `Tin nhắn kiểm thử ${i + 1}`,
    ngay_gui: '2026-11-17T10:00:00Z',
    ngay_doc: null,
  }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    let data: unknown = null;
    if (url.pathname === '/api/auth/me')
      data = { ma_tai_khoan: 7, vai_tro: 'KhachHang' };
    if (url.pathname === '/api/inbox/mine') {
      const after = Number(url.searchParams.get('after') || 0);
      data = {
        messages: messages.filter((m) => Number(m.ma_tin_nhan) > after),
        hasMore: false,
        seenThrough: null,
      };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto(`${process.env.MOBILE_TEST_URL}/contact`);
  const input = page.getByLabel('Tin nhắn cho cửa hàng');
  const send = page.getByRole('button', { name: 'Gửi tin nhắn', exact: true });
  const newest = page.getByText('Tin nhắn kiểm thử 40', { exact: true });
  await expect(input).toBeVisible({ timeout: 30000 });
  const draft = 'Mình đang nhập câu hỏi\nNội dung vẫn nhìn thấy được';
  await input.fill(draft);
  for (const height of [440, 844, 500, 844]) {
    await page.setViewportSize({ width: 390, height });
    await expect(input).toHaveValue(draft);
    await expect(input).toBeInViewport({ ratio: 1 });
    await expect(send).toBeInViewport({ ratio: 1 });
    await expect(newest).toBeInViewport({ ratio: 1 });
    await expect(input).toBeFocused();
  }
});
