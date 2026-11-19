import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures';
test('seller inbox supports conversation drafts, retry identity, receipts and customer replies', async ({
  page,
}) => {
  await mockApi(page);
  const messages: any[] = [
    {
      ma_tin_nhan: '1',
      ben_gui: 'KhachHang',
      noi_dung: 'Cần tư vấn bảo hành',
      ngay_gui: '2026-11-17T10:00:00Z',
      ngay_doc: null,
    },
  ];
  let fail = true;
  const sent: any[] = [];
  await page.route('**/api/inbox/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname,
      method = route.request().method(),
      data = route.request().postDataJSON();
    if (path.endsWith('/threads'))
      return route.fulfill({
        json: {
          data: [
            {
              ma_tai_khoan: 2,
              ho_ten: 'Khách A',
              ten_dang_nhap: 'customer-a',
              noi_dung: 'Cần tư vấn bảo hành',
              chua_doc: 1,
            },
            {
              ma_tai_khoan: 4,
              ho_ten: 'Khách B',
              ten_dang_nhap: 'customer-b',
              noi_dung: 'Hỏi đơn hàng',
              chua_doc: 0,
            },
          ],
        },
      });
    if (method === 'POST' && !path.endsWith('/read')) {
      sent.push(data);
      if (fail)
        return route.fulfill({
          status: 503,
          json: { message: 'Chưa gửi được tin' },
        });
      messages.push({
        ma_tin_nhan: '2',
        ben_gui: 'CuaHang',
        noi_dung: data.noi_dung,
        ngay_gui: '2026-11-17T10:01:00Z',
        ngay_doc: null,
      });
      return route.fulfill({ json: { data: null } });
    }
    if (method === 'POST') return route.fulfill({ json: { data: null } });
    const after = Number(url.searchParams.get('after') || 0);
    return route.fulfill({
      json: {
        data: {
          messages: path.endsWith('/4')
            ? []
            : messages.filter((m) => Number(m.ma_tin_nhan) > after),
          hasMore: false,
          seenThrough: null,
        },
      },
    });
  });
  await page.goto('/contacts');
  await page.getByRole('button', { name: /Khách A/ }).click();
  await expect(
    page.locator('.inbox-bubble').getByText('Cần tư vấn bảo hành'),
  ).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Tin nhắn cho khách hàng' });
  await input.fill('Nội dung nháp');
  await page.getByRole('button', { name: /Khách B/ }).click();
  await expect(input).toHaveValue('');
  await page.getByRole('button', { name: /Khách A/ }).click();
  await expect(input).toHaveValue('Nội dung nháp');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(
    page.getByText('Chưa gửi được tin', { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue('Nội dung nháp');
  fail = false;
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(page.locator('.inbox-bubble.outgoing')).toContainText(
    'Nội dung nháp',
  );
  expect(sent).toHaveLength(2);
  expect(sent[0].request_id).toBe(sent[1].request_id);
  await input.fill('Nháp khi chuyển tab');
  await page.clock.install();
  await page.getByRole('tab', { name: 'Liên hệ khách vãng lai' }).click();
  let backgroundRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/inbox/'))
      backgroundRequests++;
  });
  await page.clock.fastForward(12000);
  expect(backgroundRequests).toBe(0);
  await page.getByRole('tab', { name: 'Tin nhắn khách hàng' }).click();
  await expect(input).toHaveValue('Nháp khi chuyển tab');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
