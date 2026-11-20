import test from 'node:test';
import assert from 'node:assert/strict';
import {
  notificationDestination,
  notificationTitle,
} from '../utils/notifications.ts';

test('notification navigation opens an owned order or a contact reply, while general announcements stay in the list', () => {
  assert.equal(
    notificationDestination({ ma_don_hang: 42, tieu_de: 'Order update' }),
    'order',
  );
  assert.equal(
    notificationTitle({ ma_don_hang: 42, tieu_de: 'Order update' }),
    'Đơn hàng #42',
  );
  for (const tieu_de of ['Contact reply', 'Phản hồi liên hệ']) {
    assert.equal(notificationDestination({ tieu_de }), 'contact');
    assert.equal(notificationTitle({ tieu_de }), 'Cửa hàng đã phản hồi');
  }
  assert.equal(
    notificationDestination({ tieu_de: 'Quà tặng thành viên' }),
    null,
  );
  assert.equal(
    notificationTitle({ tieu_de: 'Quà tặng thành viên' }),
    'Quà tặng thành viên',
  );
  assert.equal(notificationDestination({}), null);
  assert.equal(notificationTitle({}), 'Thông báo từ ElectricShop');
});
