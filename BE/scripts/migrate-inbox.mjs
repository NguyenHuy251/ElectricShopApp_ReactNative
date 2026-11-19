import { pathToFileURL } from 'node:url';
import { pool } from '../dist/config/database.js';

export async function migrateInbox(db = pool) {
  const [columns] = await db.query('SHOW COLUMNS FROM lien_he');
  if (!columns.some((column) => column.Field === 'phan_hoi')) {
    await db.query('ALTER TABLE lien_he ADD COLUMN phan_hoi TEXT NULL');
  }
  if (!columns.some((column) => column.Field === 'ngay_phan_hoi')) {
    await db.query(
      'ALTER TABLE lien_he ADD COLUMN ngay_phan_hoi DATETIME NULL',
    );
  }
  await db.query(`CREATE TABLE IF NOT EXISTS tin_nhan_ho_tro (
    ma_tin_nhan BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ma_khach_hang INT NOT NULL,
    ma_nguoi_gui INT NULL,
    ben_gui ENUM('KhachHang','CuaHang') NOT NULL,
    noi_dung TEXT NOT NULL,
    ngay_gui DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ngay_doc DATETIME(3) NULL,
    request_id VARCHAR(64) NULL,
    legacy_key VARCHAR(64) NULL UNIQUE,
    UNIQUE KEY uq_inbox_request (ma_khach_hang, ben_gui, request_id),
    INDEX idx_inbox_thread (ma_khach_hang, ma_tin_nhan),
    INDEX idx_inbox_unread (ma_khach_hang, ben_gui, ngay_doc),
    FOREIGN KEY (ma_khach_hang) REFERENCES tai_khoan(ma_tai_khoan),
    FOREIGN KEY (ma_nguoi_gui) REFERENCES tai_khoan(ma_tai_khoan)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`INSERT INTO tin_nhan_ho_tro (ma_khach_hang,ma_nguoi_gui,ben_gui,noi_dung,ngay_gui,ngay_doc,legacy_key)
    SELECT * FROM (
      SELECT l.ma_tai_khoan AS customer, l.ma_tai_khoan AS sender, 'KhachHang' AS side,
        CONCAT(l.tieu_de, '\\n', l.noi_dung) AS body, l.ngay_gui AS sent,
        IF(l.phan_hoi IS NULL,NULL,l.ngay_gui) AS read_at, CONCAT('contact:',l.ma_lien_he) AS legacy
      FROM lien_he l JOIN tai_khoan t ON t.ma_tai_khoan=l.ma_tai_khoan
      UNION ALL
      SELECT l.ma_tai_khoan,NULL,'CuaHang',l.phan_hoi,COALESCE(l.ngay_phan_hoi,l.ngay_gui),NULL,CONCAT('reply:',l.ma_lien_he)
      FROM lien_he l JOIN tai_khoan t ON t.ma_tai_khoan=l.ma_tai_khoan
      WHERE l.phan_hoi IS NOT NULL AND TRIM(l.phan_hoi)<>''
    ) old_messages WHERE NOT EXISTS (SELECT 1 FROM tin_nhan_ho_tro n WHERE n.legacy_key=old_messages.legacy)
    ORDER BY sent,legacy`);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await migrateInbox();
    console.log('Inbox schema ready; previous contacts preserved.');
  } finally {
    await pool.end();
  }
}
