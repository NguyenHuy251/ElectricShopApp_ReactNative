import api from './api';

export type ShopNotification = {
  ma_thong_bao: number;
  tieu_de?: string | null;
  noi_dung: string;
  ma_don_hang?: number | null;
  da_doc: boolean | number;
  ngay_tao?: string | null;
};

export const notificationService = {
  async list(before?: number): Promise<ShopNotification[]> {
    const response = await api.get('/shop/notifications', {
      params: { limit: 50, before },
    });
    return response.data.data;
  },
  async unreadCounts() {
    const [notifications, inbox] = await Promise.all([
      api.get('/shop/notifications/unread-count'),
      api.get('/inbox/mine/unread'),
    ]);
    return {
      notifications: Number(notifications.data.data.count) || 0,
      inbox: Number(inbox.data.data.count) || 0,
    };
  },
  read: (id: number) => api.put(`/shop/notifications/${id}/read`),
  readAll: (upTo: number) =>
    api.put('/shop/notifications/read-all', { up_to: upTo }),
};
