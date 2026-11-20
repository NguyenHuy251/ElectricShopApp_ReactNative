import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router from '../dist/routes/shop.routes.js';
import { pool } from '../dist/config/database.js';
import { signToken } from '../dist/utils/jwt.js';

const query = pool.query,
  execute = pool.execute;
test.afterEach(() => {
  pool.query = query;
  pool.execute = execute;
});
test.after(() => pool.end());
const users = {
  1: {
    ma_tai_khoan: 1,
    ten_dang_nhap: 'customer',
    vai_tro: 'KhachHang',
    trang_thai: 'HoatDong',
  },
  2: {
    ma_tai_khoan: 2,
    ten_dang_nhap: 'other',
    vai_tro: 'KhachHang',
    trang_thai: 'HoatDong',
  },
};
async function run(fn) {
  const app = express();
  app.use(express.json());
  app.use('/shop', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await fn((path, account = 1, body) =>
      fetch(
        `http://127.0.0.1:${server.address().port}/shop/notifications${path}`,
        {
          method: body === undefined ? 'GET' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(account
              ? { Authorization: `Bearer ${signToken(users[account])}` }
              : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      ),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
function database(rows) {
  pool.query = async (sql, args) => {
    if (sql.includes('token_version FROM tai_khoan')) return [[users[args[0]]]];
    assert.match(sql, /WHERE ma_tai_khoan=\?/);
    let owned = rows.filter((row) => row.ma_tai_khoan === args[0]);
    if (sql.includes('COUNT(*)'))
      return [[{ count: owned.filter((row) => !row.da_doc).length }]];
    if (sql.includes('ma_thong_bao < ?'))
      owned = owned.filter((row) => row.ma_thong_bao < args[1]);
    return [
      owned
        .toSorted((a, b) => b.ma_thong_bao - a.ma_thong_bao)
        .slice(0, args.at(-1))
        .map((row) => ({ ...row })),
    ];
  };
  pool.execute = async (sql, args) => {
    assert.match(sql, /WHERE ma_tai_khoan=\? AND ma_thong_bao<=\?/);
    for (const row of rows)
      if (row.ma_tai_khoan === args[0] && row.ma_thong_bao <= args[1])
        row.da_doc = true;
    return [{ affectedRows: 1 }];
  };
}
test('notifications paginate only the current customer and count unread outside the loaded page', async () => {
  const rows = Array.from({ length: 105 }, (_, i) => ({
    ma_thong_bao: i + 1,
    ma_tai_khoan: 1,
    da_doc: i >= 5,
  }));
  rows.push({ ma_thong_bao: 200, ma_tai_khoan: 2, da_doc: false });
  database(rows);
  await run(async (request) => {
    assert.equal((await request('', null)).status, 401);
    assert.equal((await request('/unread-count', null)).status, 401);
    const page = (await (await request('?limit=50&ma_tai_khoan=2')).json())
      .data;
    assert.equal(page.length, 50);
    assert.equal(page[0].ma_thong_bao, 105);
    assert.ok(page.every((row) => row.ma_tai_khoan === 1 && row.da_doc));
    const older = (
      await (
        await request(`?limit=50&before=${page.at(-1).ma_thong_bao}`)
      ).json()
    ).data;
    assert.equal(older[0].ma_thong_bao, 55);
    assert.equal((await (await request('/unread-count')).json()).data.count, 5);
    assert.equal(
      (await (await request('/unread-count', 2)).json()).data.count,
      1,
    );
  });
});
test('read-all validates its snapshot and preserves other accounts and newly arriving notifications', async () => {
  const rows = [
    { ma_thong_bao: 1, ma_tai_khoan: 1, da_doc: false },
    { ma_thong_bao: 2, ma_tai_khoan: 2, da_doc: false },
    { ma_thong_bao: 3, ma_tai_khoan: 1, da_doc: false },
  ];
  database(rows);
  await run(async (request) => {
    assert.equal((await request('/read-all', null, { up_to: 1 })).status, 401);
    for (const up_to of [null, 0, -1, 'oops', 1.5])
      assert.equal((await request('/read-all', 1, { up_to })).status, 400);
    for (const path of ['?limit=101', '?limit=0', '?before=-1', '?before=nope'])
      assert.equal((await request(path)).status, 400);
    assert.equal(
      (await request('/read-all', 1, { up_to: 1, ma_tai_khoan: 2 })).status,
      200,
    );
    assert.deepEqual(
      rows.map((row) => row.da_doc),
      [true, false, false],
    );
    assert.equal((await (await request('/unread-count')).json()).data.count, 1);
    assert.equal((await request('/read-all', 1, { up_to: 1 })).status, 200);
  });
});
