import { expect, test } from '@playwright/test';

test('customers manage multiple shipping addresses and choose one at checkout', async ({ page }) => {
  const baseUrl = process.env.MOBILE_TEST_URL;
  test.skip(!baseUrl, 'Requires a running Expo web server');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const customer = { ma_tai_khoan: 7, ho_ten: 'Khách kiểm thử', vai_tro: 'KhachHang', so_dien_thoai: '0911222333', dia_chi: 'Địa chỉ trong hồ sơ khách hàng' };
  await page.addInitScript(user => {
    localStorage.setItem('token', 'addresses-fixture');
    localStorage.setItem('user', JSON.stringify(user));
  }, customer);

  type Address = { ma_dia_chi: number; ho_ten: string; so_dien_thoai: string; dia_chi: string; mac_dinh: number };
  const addresses: Address[] = [];
  let placedOrder: Record<string, unknown> | undefined;
  const home = { ho_ten: 'Nguyễn Minh An', so_dien_thoai: '0912345678', dia_chi: '12 Lê Lợi, phường Sài Gòn, TP.HCM' };
  const office = { ho_ten: 'Trần Lan Chi', so_dien_thoai: '0976543210', dia_chi: '48 Hai Bà Trưng, phường Sài Gòn, TP.HCM' };
  const officeEdited = '55 Nguyễn Huệ, phường Sài Gòn, TP.HCM';

  await page.route('**/api/**', route => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (!pathname.startsWith('/api/')) return route.fallback();
    const send = (data: unknown) => route.fulfill({ json: { data } });
    if (pathname === '/api/auth/me') return send(customer);
    if (pathname === '/api/shop/addresses') {
      if (request.method() === 'GET') return send([...addresses].sort((a, b) => b.mac_dinh - a.mac_dinh));
      const input = request.postDataJSON();
      addresses.push({ ...input, ma_dia_chi: addresses.length + 1, mac_dinh: Number(!addresses.length) });
      return send(null);
    }
    const addressPath = pathname.match(/^\/api\/shop\/addresses\/(\d+)(\/default)?$/);
    if (addressPath) {
      const index = addresses.findIndex(address => address.ma_dia_chi === Number(addressPath[1]));
      if (request.method() === 'DELETE') {
        addresses.splice(index, 1);
        if (addresses.length === 1) addresses[0].mac_dinh = 1;
      } else if (addressPath[2]) {
        addresses.forEach((address, i) => { address.mac_dinh = Number(i === index); });
      } else {
        addresses[index] = { ...addresses[index], ...request.postDataJSON() };
      }
      return send(null);
    }
    if (pathname === '/api/don-hang/checkout') return send({
      items: [{ ma_san_pham: 7, ten_san_pham: 'Loa Bluetooth', gia_ban: 500000, so_luong: 1 }],
      tam_tinh: 500000, giam_gia: 0, phi_giao_hang: 0, tong_tien: 500000, issues: [], can_checkout: true, snapshot: 'address-test',
    });
    if (pathname === '/api/don-hang' && request.method() === 'POST') {
      placedOrder = request.postDataJSON();
      return send({ ma_don_hang: 61 });
    }
    return send([]);
  });

  await page.goto(new URL('/profile', baseUrl).href);
  const profileInfo = page.getByTestId('profile-info');
  await expect(profileInfo.getByText('Chưa có địa chỉ mặc định')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(customer.dia_chi, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sổ địa chỉ', exact: true }).click({ timeout: 30000 });
  await expect(page).toHaveURL(/\/addresses$/);
  await expect(page.getByText('Chưa có địa chỉ giao hàng')).toBeVisible();
  const recipient = page.getByRole('textbox', { name: 'Họ tên người nhận', exact: true });
  const phone = page.getByRole('textbox', { name: 'Số điện thoại', exact: true });
  const street = page.getByRole('textbox', { name: 'Địa chỉ giao hàng', exact: true });
  const save = page.getByRole('button', { name: 'Lưu địa chỉ', exact: true });
  const add = page.getByRole('button', { name: 'Thêm địa chỉ', exact: true });
  for (const address of [home, office]) {
    await add.click();
    await recipient.fill(address.ho_ten);
    await phone.fill(address.so_dien_thoai);
    await street.fill(address.dia_chi);
    await save.click();
    await expect(page.getByText(address.dia_chi, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: `Sửa địa chỉ của ${office.ho_ten}` }).click();
  await expect(street).toHaveValue(office.dia_chi);
  await street.fill(officeEdited);
  await save.click();
  await expect(page.getByText(officeEdited, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Đặt địa chỉ của ${office.ho_ten} làm mặc định` }).click();
  await expect(page.getByText('Đã đổi địa chỉ mặc định.')).toBeVisible();
  await expect(page.getByRole('button', { name: `Đặt địa chỉ của ${home.ho_ten} làm mặc định` })).toBeVisible();
  await page.goBack();
  await expect(profileInfo.getByText(officeEdited, { exact: true })).toBeVisible();
  await expect(page.getByText(officeEdited, { exact: true })).toHaveCount(1);
  await expect(profileInfo.getByText(home.dia_chi, { exact: true })).toHaveCount(0);

  await page.goto(new URL('/checkout', baseUrl).href);
  const checkoutRecipient = page.getByRole('textbox', { name: 'Họ tên người nhận *', exact: true });
  const checkoutAddress = page.getByRole('textbox', { name: 'Địa chỉ nhận hàng *', exact: true });
  await expect(checkoutRecipient).toHaveValue(office.ho_ten);
  await expect(checkoutAddress).toHaveValue(officeEdited);
  const picker = page.getByRole('button', { name: 'Đổi địa chỉ đã lưu', exact: true });
  await picker.click();
  await page.getByRole('button', { name: `Chọn địa chỉ ${home.ho_ten}, ${home.dia_chi}` }).click();
  await expect(checkoutAddress).toHaveValue(home.dia_chi);
  await page.getByRole('button', { name: 'Quản lý địa chỉ' }).click();
  const remove = page.getByRole('button', { name: `Xóa địa chỉ của ${office.ho_ten}` });
  await remove.click();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByText(officeEdited, { exact: true })).toBeVisible();
  await remove.click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page.getByText(officeEdited, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mặc định', { exact: true })).toBeVisible();

  await page.goBack();
  await expect(checkoutRecipient).toHaveValue(home.ho_ten);
  await picker.click();
  await expect(page.getByRole('button', { name: `Chọn địa chỉ ${home.ho_ten}, ${home.dia_chi}` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Chọn địa chỉ ${office.ho_ten}, ${officeEdited}` })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kiểm tra đơn hàng' }).click();
  await page.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }).click();
  await page.getByRole('button', { name: 'Xác nhận đặt hàng COD' }).click();
  await expect.poll(() => placedOrder).toMatchObject({
    ho_ten_nguoi_nhan: home.ho_ten, so_dien_thoai: home.so_dien_thoai, dia_chi_giao_hang: home.dia_chi,
  });
  await page.goto(new URL('/profile', baseUrl).href);
  await expect(profileInfo.getByText(home.dia_chi, { exact: true })).toBeVisible();
});
