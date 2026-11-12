import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures';

test('dropdown remains selectable and dismissible with system reduced motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1536, height: 395 });
  await mockApi(page);
  await page.goto('/products');
  const control = page.locator('.toolbar .ant-select').first();
  await expect(page.getByRole('cell', { name: 'Nồi cơm điện' })).toBeVisible();
  await control.locator('.ant-select-selector').click();
  const popup = page.locator('.ant-select-dropdown:visible');
  // Assert position before clicking: locator.click() would otherwise scroll an
  // incorrectly positioned popup back into view and conceal the regression.
  await expect.poll(async () => {
    const box = await popup.boundingBox();
    return !!box && box.x >= 0 && box.x + box.width <= 1537;
  }).toBe(true);
  await popup.getByTitle('Gia dụng', { exact: true }).click();
  await expect(popup).toHaveCount(0);
  await control.locator('.ant-select-selector').click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  // OS accessibility settings may change without reloading the application.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await control.locator('.ant-select-selector').click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await control.locator('.ant-select-selector').click();
  await page.getByRole('heading', { name: 'Sản phẩm', exact: true }).click();
  await expect(popup).toHaveCount(0);
});

test('long category dropdown supports scrolling, pointer selection, dismissal and clearing', async ({ page }) => {
  const mock = await mockApi(page);
  mock.data['danh-muc'] = Array.from({ length: 80 }, (_, index) => ({ ma_danh_muc: index + 1, ten_danh_muc: `Danh mục ${index + 1}`, trang_thai: 1 }));
  await page.goto('/products');
  const select = page.getByRole('combobox', { name: 'Lọc danh mục' });
  const control = page.locator('.ant-select').filter({ has: select });
  await expect(page.getByRole('cell', { name: 'Nồi cơm điện' })).toBeVisible();
  await control.locator('.ant-select-selector').click();
  const popup = page.locator('.ant-select-dropdown:visible');
  await popup.locator('.rc-virtual-list-holder').evaluate(element => { element.scrollTop = element.scrollHeight; });
  const lastOption = popup.getByTitle('Danh mục 80', { exact: true });
  await lastOption.scrollIntoViewIfNeeded();
  await lastOption.click();
  await expect(popup).toHaveCount(0);
  await expect(control).toContainText('Danh mục 80');
  await expect.poll(() => mock.requests.some(request => request.resource === 'san-pham' && new URLSearchParams(request.search).get('ma_danh_muc') === '80')).toBe(true);
  await control.locator('.ant-select-selector').click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await control.locator('.ant-select-selector').click();
  await page.getByRole('heading', { name: 'Sản phẩm', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await control.hover();
  await control.locator('.ant-select-clear').click();
  await expect.poll(() => mock.requests.filter(request => request.resource === 'san-pham').at(-1)?.search || '').not.toContain('ma_danh_muc');
});

test('dropdown in a modal accepts pointer and keyboard input and keeps the chosen ID', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mock = await mockApi(page);
  mock.data['tai-khoan'].push({ ma_tai_khoan: 20, ten_dang_nhap: 'staff-20', ho_ten: 'Nhân viên hai', vai_tro: 'NhanVien', trang_thai: 'HoatDong', permissions: ['contacts'] });
  await page.goto('/employees');
  await page.getByRole('button', { name: 'Phân quyền tài khoản', exact: true }).click();
  const modal = page.getByRole('dialog');
  const select = modal.getByRole('combobox', { name: 'Tài khoản phân quyền' });
  await select.click();
  await page.locator('.ant-select-dropdown:visible').getByTitle('Nhân viên hai · staff-20 · Chưa liên kết hồ sơ', { exact: true }).click();
  await expect(modal.getByRole('checkbox').nth(5)).toBeChecked();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  await select.focus();
  await select.press('ArrowDown');
  await select.press('ArrowUp');
  await select.press('Enter');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(mock.requests.filter(request => request.method === 'PUT')).toHaveLength(0);
});

test('order filter dropdown selects a value and closes on a narrow viewport', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/orders');
  const select = page.locator('.toolbar').getByRole('combobox');
  await select.click();
  await page.locator('.ant-select-dropdown:visible').getByTitle('Đã hủy', { exact: true }).click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  await expect(page.locator('.toolbar')).toContainText('Đã hủy');
  await expect(page.getByText('Chưa có đơn hàng', { exact: true })).toBeVisible();
});
