export type NotificationLink = {
  ma_don_hang?: number | null;
  tieu_de?: string | null;
};

export function notificationTitle(notification: NotificationLink) {
  if (notification.ma_don_hang) return `Đơn hàng #${notification.ma_don_hang}`;
  if (
    ['Contact reply', 'Phản hồi liên hệ'].includes(notification.tieu_de || '')
  )
    return 'Cửa hàng đã phản hồi';
  return notification.tieu_de || 'Thông báo từ ElectricShop';
}

export function notificationDestination(notification: NotificationLink) {
  if (notification.ma_don_hang) return 'order';
  if (
    ['Contact reply', 'Phản hồi liên hệ'].includes(notification.tieu_de || '')
  )
    return 'contact';
  return null;
}
