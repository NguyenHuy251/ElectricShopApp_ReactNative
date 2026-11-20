import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async () => {
  test.skip(!process.env.MOBILE_TEST_URL, 'Requires a running Expo web server');
  test.setTimeout(90000);
});

async function setup(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'notifications-fixture');
    localStorage.setItem(
      'user',
      JSON.stringify({
        ma_tai_khoan: 7,
        ho_ten: 'Khách kiểm thử',
        vai_tro: 'KhachHang',
      }),
    );
  });
  const rows = Array.from({ length: 60 }, (_, i) => ({
    ma_thong_bao: i + 1,
    tieu_de:
      i === 59
        ? 'Order update'
        : i === 58
          ? 'Thông báo bảo trì'
          : `Sự kiện ${i + 1}`,
    noi_dung:
      i === 59
        ? 'Đơn hàng đang được giao đến bạn.'
        : 'Cập nhật dành cho thành viên ElectricShop.',
    ma_don_hang: i === 59 ? 42 : null,
    da_doc: i < 58,
    ngay_tao: '2026-11-19T10:00:00Z',
  }));
  const state = {
    failReadAll: false,
    inbox: 2,
    cartRequests: 0,
    reads: [] as number[],
    records: rows,
  };
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    if (!path.startsWith('/api/')) return route.fallback();
    const body = route.request().postDataJSON();
    const reply = (data: unknown) =>
      route.fulfill({ json: { success: true, data } });
    if (path.startsWith('/api/gio-hang')) state.cartRequests++;
    if (path === '/api/auth/me')
      return reply({
        ma_tai_khoan: 7,
        vai_tro: 'KhachHang',
        ho_ten: 'Khách kiểm thử',
      });
    if (path === '/api/shop/notifications/unread-count')
      return reply({ count: rows.filter((row) => !row.da_doc).length });
    if (path === '/api/shop/notifications/read-all') {
      if (state.failReadAll)
        return route.fulfill({
          status: 503,
          json: { message: 'Chưa lưu được trạng thái đọc' },
        });
      rows
        .filter((row) => row.ma_thong_bao <= body.up_to)
        .forEach((row) => (row.da_doc = true));
      return reply(null);
    }
    const read = path.match(/\/notifications\/(\d+)\/read$/);
    if (read) {
      const id = Number(read[1]);
      state.reads.push(id);
      rows
        .filter((row) => row.ma_thong_bao === id)
        .forEach((row) => (row.da_doc = true));
      return reply(null);
    }
    if (path === '/api/shop/notifications') {
      const before = Number(url.searchParams.get('before') || Infinity);
      return reply(
        rows
          .filter((row) => row.ma_thong_bao < before)
          .toReversed()
          .slice(0, 50),
      );
    }
    if (path === '/api/inbox/mine/unread') return reply({ count: state.inbox });
    if (path === '/api/inbox/mine/read') {
      state.inbox = 0;
      return reply(null);
    }
    if (path === '/api/inbox/mine')
      return reply({
        messages: [
          {
            ma_tin_nhan: '2',
            ben_gui: 'CuaHang',
            noi_dung: 'Cửa hàng hỗ trợ bạn tại đây.',
            ngay_gui: '2026-11-19T10:00:00Z',
            ngay_doc: null,
          },
        ],
        hasMore: false,
        seenThrough: null,
      });
    if (path === '/api/don-hang/42')
      return reply({
        ma_don_hang: 42,
        trang_thai: 'DangGiao',
        ngay_dat: '2026-11-19',
        tong_tien: 100000,
        items: [],
      });
    return reply([]);
  });
  return state;
}

test('bell replaces the home cart shortcut, updates unread badges and opens order/inbox destinations', async ({
  page,
}, testInfo) => {
  const state = await setup(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.MOBILE_TEST_URL!);
  const bell = page.getByRole('link', {
    name: 'Mở thông báo, 4 cập nhật chưa đọc',
    exact: true,
  });
  await expect(bell).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole('button', { name: 'Mở giỏ hàng', exact: true }),
  ).toHaveCount(0);
  expect(state.cartRequests).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('home-bell.png') });
  await bell.click();
  await expect(page.getByText('Cập nhật dành cho bạn')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('notifications.png') });
  await page.getByRole('tab', { name: 'Chưa đọc', exact: true }).click();
  await page
    .getByRole('button', { name: 'Thông báo bảo trì, chưa đọc', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Thông báo bảo trì, chưa đọc',
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Đơn hàng #42, chưa đọc', exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\/42$/);
  await expect(page.getByText('Đơn #42', { exact: true })).toBeVisible();
  expect(state.reads).toEqual([59, 60]);
  await page.goto(process.env.MOBILE_TEST_URL!);
  await page
    .getByRole('link', {
      name: 'Mở thông báo, 2 cập nhật chưa đọc',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {
      name: 'Mở hộp thư, 2 tin nhắn chưa đọc',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByLabel('Tin nhắn cho cửa hàng')).toBeVisible();
  await expect.poll(() => state.inbox).toBe(0);
  await page.goto(process.env.MOBILE_TEST_URL!);
  await expect(
    page.getByRole('link', { name: 'Mở thông báo', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the account header has one notification bell and keeps the profile edit action', async ({ page }) => {
  await setup(page);
  await page.goto(`${process.env.MOBILE_TEST_URL}/profile`);
  const bell = page.getByRole('link', { name: 'Mở thông báo, 4 cập nhật chưa đọc', exact: true });
  const heading = page.getByRole('heading', { name: 'Xin chào, bạn!', exact: true });
  const edit = page.getByRole('button', { name: 'Chỉnh sửa thông tin tài khoản', exact: true });
  await expect(bell).toBeInViewport({ ratio: 1, timeout: 30000 });
  await expect(page.locator('a[href="/notifications"]')).toHaveCount(1);
  await expect(page.getByText('Thông báo', { exact: true })).toHaveCount(0);
  expect((await bell.boundingBox())!.x).toBeGreaterThan((await heading.boundingBox())!.x);
  expect((await bell.boundingBox())!.y).toBeLessThan((await edit.boundingBox())!.y);
  await bell.click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByText('Cập nhật dành cho bạn')).toBeVisible();
});

test('a delayed background refresh cannot ignore a tap or restore an already-read notification', async ({
  page,
}) => {
  const state = await setup(page);
  await page.clock.install();
  await page.goto(`${process.env.MOBILE_TEST_URL}/notifications`);
  const unread = page.getByRole('button', {
    name: 'Thông báo bảo trì, chưa đọc',
    exact: true,
  });
  await expect(unread).toBeVisible({ timeout: 30000 });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route('**/api/shop/notifications?*', async (route) => {
    const snapshot = state.records
      .toReversed()
      .slice(0, 50)
      .map((row) => ({ ...row }));
    started = true;
    await gate;
    await route.fulfill({ json: { success: true, data: snapshot } });
  });
  await page.clock.fastForward(10000);
  await expect.poll(() => started).toBe(true);
  await unread.click();
  const read = page.getByRole('button', {
    name: 'Thông báo bảo trì, đã đọc',
    exact: true,
  });
  await expect(read).toBeVisible();
  const completed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/shop/notifications',
  );
  release();
  await completed;
  await expect(read).toBeVisible();
  expect(state.reads).toEqual([59]);
});

test('notifications load history and retain unread state when read-all fails, without marking inbox messages as seen', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(`${process.env.MOBILE_TEST_URL}/notifications`);
  await expect(
    page.getByRole('button', { name: 'Sự kiện 11, đã đọc', exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole('button', { name: 'Tải thông báo trước', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Sự kiện 1, đã đọc', exact: true }),
  ).toBeVisible();
  state.failReadAll = true;
  const readAll = page.getByRole('button', {
    name: 'Đánh dấu tất cả thông báo đã đọc',
    exact: true,
  });
  await readAll.click();
  await expect(page.getByRole('alert')).toContainText(
    'Chưa lưu được trạng thái đọc',
  );
  await expect(
    page.getByRole('button', { name: 'Đơn hàng #42, chưa đọc', exact: true }),
  ).toBeVisible();
  state.failReadAll = false;
  await readAll.click();
  await page.getByRole('tab', { name: 'Chưa đọc', exact: true }).click();
  await expect(page.getByText('Bạn đã xem hết thông báo')).toBeVisible();
  expect(state.inbox).toBe(2);
  await expect(
    page.getByRole('button', {
      name: 'Mở hộp thư, 2 tin nhắn chưa đọc',
      exact: true,
    }),
  ).toBeVisible();
});
