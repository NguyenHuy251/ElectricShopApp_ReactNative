import { pathToFileURL } from 'node:url';
import { pool } from '../dist/config/database.js';

export async function migrateOrderConfirmation(db = pool) {
  const [columns] = await db.query('SHOW COLUMNS FROM don_hang');
  const existing = new Set(columns.map((column) => column.Field));
  const additions = [
    ['ma_tai_khoan_xac_nhan', 'INT NULL'],
    ['ten_nhan_vien_xac_nhan', 'VARCHAR(100) NULL'],
    ['ngay_xac_nhan', 'DATETIME NULL'],
  ].filter(([name]) => !existing.has(name));
  if (additions.length)
    await db.query(
      `ALTER TABLE don_hang ${additions.map(([name, type]) => `ADD COLUMN ${name} ${type}`).join(', ')}`,
    );
  // Historical sales assignments do not establish who actually confirmed an order.
  // Keep old confirmation fields NULL instead of inferring an actor.
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await migrateOrderConfirmation();
    console.log('Order confirmation fields ready; existing orders preserved.');
  } finally {
    await pool.end();
  }
}
