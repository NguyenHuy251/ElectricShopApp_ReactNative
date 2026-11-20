import api from './api';

export type AddressInput = {
  ho_ten: string;
  so_dien_thoai: string;
  dia_chi: string;
  mac_dinh: boolean;
};

export type ShippingAddress = Omit<AddressInput, 'mac_dinh'> & {
  ma_dia_chi: number;
  mac_dinh: boolean | 0 | 1;
};

export const addressService = {
  async list(): Promise<ShippingAddress[]> {
    const response = await api.get('/shop/addresses');
    return response.data.data || [];
  },
  async save(address: AddressInput, id?: number) {
    if (id === undefined) await api.post('/shop/addresses', address);
    else await api.put(`/shop/addresses/${id}`, address);
  },
  async setDefault(id: number) {
    await api.put(`/shop/addresses/${id}/default`);
  },
  async remove(id: number) {
    await api.delete(`/shop/addresses/${id}`);
  },
};
