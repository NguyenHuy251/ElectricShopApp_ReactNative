import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../dist/config/database.js';
import { attachProductStats } from '../dist/services/productStats.service.js';

const originalQuery = pool.query;
test.afterEach(() => { pool.query = originalQuery; });
test.after(async () => { await pool.end(); });

test('product statistics batch delivered quantities separately from reviews and preserve product order', async () => {
  const calls = [];
  pool.query = async (sql, ids) => {
    calls.push({ sql, ids });
    if (sql.includes('FROM chi_tiet_don_hang')) {
      assert.match(sql, /dh\.trang_thai = 'DaGiao'/);
      assert.doesNotMatch(sql, /JOIN danh_gia/);
      return [[{ ma_san_pham: 7, so_luong_da_ban: '12' }]];
    }
    assert.match(sql, /AVG\(so_sao\)/);
    assert.match(sql, /COUNT\(\*\)/);
    return [[{ ma_san_pham: 7, diem_danh_gia: '4.6667', so_luong_danh_gia: '3' }]];
  };
  const input = [{ ma_san_pham: 8, ten_san_pham: 'New product' }, { ma_san_pham: 7, ten_san_pham: 'Reviewed product' }];
  const result = await attachProductStats(input);
  assert.equal(calls.length, 2);
  calls.forEach(call => assert.deepEqual(call.ids, [8, 7]));
  assert.deepEqual(result[0], { ...input[0], so_luong_da_ban: 0, diem_danh_gia: null, so_luong_danh_gia: 0 });
  assert.deepEqual(result[1], { ...input[1], so_luong_da_ban: 12, diem_danh_gia: 4.6667, so_luong_danh_gia: 3 });
  assert.equal(input[1].diem_danh_gia, undefined);
});

test('empty product pages do not query the database', async () => {
  pool.query = async () => { assert.fail('Unexpected query for an empty page'); };
  assert.deepEqual(await attachProductStats([]), []);
});
