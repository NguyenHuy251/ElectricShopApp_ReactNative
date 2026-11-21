import { test, expect } from '@playwright/test';
import { mockApi } from './fixtures';

test('sidebar toggles content width and the mobile drawer remains available', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const mock = await mockApi(page);
  await page.goto('/products');
  await expect(page.getByRole('cell', { name: 'Nồi cơm điện' })).toBeVisible();
  const sidebar = page.locator('#admin-sidebar');
  const width = await page.locator('.main').evaluate(element => element.clientWidth);
  const requests = mock.requests.length;
  await page.getByRole('button', { name: 'Ẩn menu', exact: true }).click();
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole('button', { name: 'Hiện menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.main').evaluate(element => element.clientWidth)).toBeGreaterThan(width);
  await page.getByRole('button', { name: 'Hiện menu', exact: true }).click();
  await expect(sidebar).toBeVisible();
  expect(mock.requests.length).toBe(requests);
  await page.getByRole('button', { name: 'Ẩn menu', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('link', { name: 'Đơn hàng', exact: true })).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Đơn hàng', exact: true })).toHaveAccessibleDescription('1 đơn chờ xác nhận');
  await drawer.getByRole('link', { name: 'Đơn hàng', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Đơn hàng', exact: true })).toBeVisible();
});
