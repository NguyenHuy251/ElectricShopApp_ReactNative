import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

interface SalesRow extends RowDataPacket { ma_san_pham: number; so_luong_da_ban: number | string }
interface RatingRow extends RowDataPacket { ma_san_pham: number; diem_danh_gia: number | string; so_luong_danh_gia: number | string }

/** Batch only the requested products; separate aggregates avoid multiplying sales by reviews. */
export async function attachProductStats<T extends { ma_san_pham: number }>(products: T[]) {
  if (!products.length) return [];
  const ids = [...new Set(products.map(product => product.ma_san_pham))];
  const placeholders = ids.map(() => '?').join(',');
  const [[sales], [ratings]] = await Promise.all([
    pool.query<SalesRow[]>(`SELECT ct.ma_san_pham, SUM(ct.so_luong) AS so_luong_da_ban
      FROM chi_tiet_don_hang ct JOIN don_hang dh ON dh.ma_don_hang = ct.ma_don_hang
      WHERE dh.trang_thai = 'DaGiao' AND ct.ma_san_pham IN (${placeholders})
      GROUP BY ct.ma_san_pham`, ids),
    pool.query<RatingRow[]>(`SELECT ma_san_pham, AVG(so_sao) AS diem_danh_gia, COUNT(*) AS so_luong_danh_gia
      FROM danh_gia WHERE ma_san_pham IN (${placeholders}) GROUP BY ma_san_pham`, ids),
  ]);
  const salesById = new Map(sales.map(row => [Number(row.ma_san_pham), row]));
  const ratingsById = new Map(ratings.map(row => [Number(row.ma_san_pham), row]));
  return products.map(product => {
    const rating = ratingsById.get(Number(product.ma_san_pham));
    return {
      ...product,
      so_luong_da_ban: Number(salesById.get(Number(product.ma_san_pham))?.so_luong_da_ban || 0),
      diem_danh_gia: rating ? Number(rating.diem_danh_gia) : null,
      so_luong_danh_gia: Number(rating?.so_luong_danh_gia || 0),
    };
  });
}
