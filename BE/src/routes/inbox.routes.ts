import { Router, type Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import {
  authenticate,
  type AuthRequest,
} from '../middleware/auth.middleware.js';
import { authorizePermission } from '../middleware/role.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();
router.use(authenticate);
const limit = rateLimit(60, 60_000);
function positive(value: unknown) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
const run =
  (handler: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response) => {
    void handler(req, res).catch(() =>
      sendError(res, 500, 'Chưa xử lý được tin nhắn. Vui lòng thử lại.'),
    );
  };
function thread(staff: boolean, req: AuthRequest) {
  return staff ? positive(req.params.id) : req.user!.ma_tai_khoan;
}
function messages(staff: boolean) {
  return run(async (req, res) => {
    const id = thread(staff, req),
      before =
        req.query.before === undefined ? null : positive(req.query.before),
      after = req.query.after === undefined ? null : positive(req.query.after);
    if (
      !id ||
      (req.query.before !== undefined && !before) ||
      (req.query.after !== undefined && !after) ||
      (before && after)
    )
      return sendError(res, 400, 'Mã cuộc trò chuyện không hợp lệ');
    const [rows] = await pool.query(
      `SELECT CAST(n.ma_tin_nhan AS CHAR) AS ma_tin_nhan,n.ben_gui,n.noi_dung,n.ngay_gui,n.ngay_doc FROM tin_nhan_ho_tro n
    WHERE n.ma_khach_hang=? ${before ? 'AND n.ma_tin_nhan < ?' : after ? 'AND n.ma_tin_nhan > ?' : ''} ORDER BY n.ma_tin_nhan ${after ? 'ASC' : 'DESC'} LIMIT 51`,
      before || after ? [id, before || after] : [id],
    );
    const data = rows as any[];
    const hasMore = data.length > 50;
    const [receipt] = await pool.query(
      `SELECT CAST(MAX(ma_tin_nhan) AS CHAR) AS seenThrough,MAX(ngay_doc) AS seenAt FROM tin_nhan_ho_tro WHERE ma_khach_hang=? AND ben_gui=? AND ngay_doc IS NOT NULL`,
      [id, staff ? 'CuaHang' : 'KhachHang'],
    );
    return sendSuccess(res, 'Tin nhắn', {
      messages: after ? data.slice(0, 50) : data.slice(0, 50).reverse(),
      hasMore,
      ...(receipt as any[])[0],
    });
  });
}
function send(staff: boolean) {
  return run(async (req, res) => {
    const id = thread(staff, req),
      { noi_dung, request_id } = req.body || {};
    if (
      !id ||
      typeof noi_dung !== 'string' ||
      !noi_dung.trim() ||
      noi_dung.trim().length > 5000 ||
      typeof request_id !== 'string' ||
      !/^[A-Za-z0-9_-]{8,64}$/.test(request_id)
    )
      return sendError(
        res,
        400,
        'Tin nhắn từ 1–5.000 ký tự và mã gửi hợp lệ là bắt buộc',
      );
    const [account] = await pool.query(
      'SELECT ma_tai_khoan FROM tai_khoan WHERE ma_tai_khoan=?',
      [id],
    );
    if (!(account as any[]).length)
      return sendError(res, 404, 'Không tìm thấy cuộc trò chuyện');
    // A retry of the same message never inserts a second copy.
    await pool.execute(
      `INSERT INTO tin_nhan_ho_tro (ma_khach_hang,ma_nguoi_gui,ben_gui,noi_dung,request_id) VALUES (?,?,?,?,?)
    ON DUPLICATE KEY UPDATE ma_tin_nhan=LAST_INSERT_ID(ma_tin_nhan)`,
      [
        id,
        req.user!.ma_tai_khoan,
        staff ? 'CuaHang' : 'KhachHang',
        noi_dung.trim(),
        request_id,
      ],
    );
    return sendSuccess(res, 'Đã gửi tin nhắn', null);
  });
}
function read(staff: boolean) {
  return run(async (req, res) => {
    const id = thread(staff, req),
      last = positive(req.body?.up_to);
    if (!id || !last) return sendError(res, 400, 'Mã tin nhắn không hợp lệ');
    await pool.execute(
      `UPDATE tin_nhan_ho_tro SET ngay_doc=COALESCE(ngay_doc,NOW(3)) WHERE ma_khach_hang=? AND ben_gui=? AND ma_tin_nhan<=? AND ngay_doc IS NULL`,
      [id, staff ? 'KhachHang' : 'CuaHang', last],
    );
    return sendSuccess(res, 'Đã đọc', null);
  });
}
router.get('/mine', messages(false));
router.get(
  '/mine/unread',
  run(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS count FROM tin_nhan_ho_tro WHERE ma_khach_hang=? AND ben_gui='CuaHang' AND ngay_doc IS NULL",
      [req.user!.ma_tai_khoan],
    );
    return sendSuccess(res, 'Tin chưa đọc', {
      count: Number((rows as any[])[0].count),
    });
  }),
);
router.post('/mine', limit, send(false));
router.post('/mine/read', read(false));
router.use(authorizePermission('contacts'));
const latestMessagesByCustomer = 'SELECT ma_khach_hang, MAX(ma_tin_nhan) AS last_id FROM tin_nhan_ho_tro GROUP BY ma_khach_hang';
router.get(
  '/pending-count',
  run(async (_req, res) => {
    const [[{ count }]] = await pool.query<(RowDataPacket & { count: number })[]>(`
      SELECT COUNT(*) AS count
      FROM (${latestMessagesByCustomer}) x
      JOIN tin_nhan_ho_tro n ON n.ma_tin_nhan = x.last_id
      WHERE n.ben_gui = 'KhachHang'
    `);
    return sendSuccess(res, 'Khách hàng đang chờ trả lời', { count: Number(count) });
  }),
);
router.get(
  '/threads',
  run(async (req, res) => {
    const q =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';
    const [rows] = await pool.query(
      `SELECT t.ma_tai_khoan,t.ho_ten,t.ten_dang_nhap,n.noi_dung,n.ngay_gui,n.ben_gui,
    (SELECT COUNT(*) FROM tin_nhan_ho_tro u WHERE u.ma_khach_hang=t.ma_tai_khoan AND u.ben_gui='KhachHang' AND u.ngay_doc IS NULL) AS chua_doc
    FROM (${latestMessagesByCustomer}) x
    JOIN tai_khoan t ON t.ma_tai_khoan=x.ma_khach_hang JOIN tin_nhan_ho_tro n ON n.ma_tin_nhan=x.last_id
    WHERE t.ho_ten LIKE ? OR t.ten_dang_nhap LIKE ?
    ORDER BY (n.ben_gui = 'KhachHang') DESC, n.ma_tin_nhan DESC LIMIT 100`,
      [`%${q}%`, `%${q}%`],
    );
    return sendSuccess(res, 'Hộp thư', rows);
  }),
);
router.get('/threads/:id', messages(true));
router.post('/threads/:id', limit, send(true));
router.post('/threads/:id/read', read(true));
export default router;
