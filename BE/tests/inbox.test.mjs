import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router from '../dist/routes/inbox.routes.js';
import { pool } from '../dist/config/database.js';
import { signToken } from '../dist/utils/jwt.js';
import { migrateInbox } from '../scripts/migrate-inbox.mjs';

const originalQuery = pool.query,
  originalExecute = pool.execute;
test.afterEach(() => {
  pool.query = originalQuery;
  pool.execute = originalExecute;
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
    ten_dang_nhap: 'admin',
    vai_tro: 'Admin',
    trang_thai: 'HoatDong',
  },
  3: {
    ma_tai_khoan: 3,
    ten_dang_nhap: 'staff',
    vai_tro: 'NhanVien',
    trang_thai: 'HoatDong',
  },
};
async function serverTest(fn) {
  const app = express();
  app.use(express.json());
  app.use('/inbox', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  try {
    await fn(async (path, account = 1, body) => {
      return fetch(`http://127.0.0.1:${server.address().port}/inbox/${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(account
            ? { Authorization: `Bearer ${signToken(users[account])}` }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    });
  } finally {
    await new Promise((r) => server.close(r));
  }
}
function dbStub() {
  const calls = [];
  pool.query = async (sql, args) => {
    if (sql.includes('token_version FROM tai_khoan')) return [[users[args[0]]]];
    if (sql.includes('staff_permissions')) return [[]];
    calls.push({ sql, args });
    if (sql.includes('SELECT ma_tai_khoan FROM tai_khoan'))
      return [[{ ma_tai_khoan: args[0] }]];
    if (sql.includes('seenThrough'))
      return [[{ seenThrough: null, seenAt: null }]];
    return [[]];
  };
  pool.execute = async (sql, args) => {
    calls.push({ sql, args });
    return [{ affectedRows: 1 }];
  };
  return calls;
}
test('inbox requires authentication and contacts permission for seller routes', async () => {
  const calls = dbStub();
  await serverTest(async (request) => {
    assert.equal((await request('mine', null)).status, 401);
    for (const path of ['threads', 'threads/9', 'pending-count']) {
      assert.equal((await request(path, 1)).status, 403);
      assert.equal((await request(path, 3)).status, 403);
    }
    assert.equal(
      (
        await request('threads/9', 1, {
          noi_dung: 'hello',
          request_id: 'request_123',
        })
      ).status,
      403,
    );
    assert.equal(calls.length, 0);
  });
});
test('customer ownership comes from session; read receipts and sends cannot target another account', async () => {
  const calls = dbStub();
  await serverTest(async (request) => {
    assert.equal((await request('mine?ma_tai_khoan=99')).status, 200);
    assert.equal(
      (
        await request('mine', 1, {
          ma_khach_hang: 99,
          ben_gui: 'CuaHang',
          noi_dung: '  Hello  ',
          request_id: 'request_123',
        })
      ).status,
      200,
    );
    assert.equal(
      (await request('mine/read', 1, { ma_khach_hang: 99, up_to: '50' }))
        .status,
      200,
    );
    const insert = calls.find((c) => c.sql.includes('INSERT INTO'));
    assert.deepEqual(insert.args, [1, 1, 'KhachHang', 'Hello', 'request_123']);
    assert.match(insert.sql, /ON DUPLICATE KEY UPDATE/);
    const update = calls.find((c) => c.sql.includes('UPDATE tin_nhan'));
    assert.deepEqual(update.args, [1, 'CuaHang', 50]);
    assert.match(update.sql, /ma_khach_hang=\?.*ma_tin_nhan<=\?/);
    assert.deepEqual(
      calls.find((c) => c.sql.includes('ORDER BY n.ma_tin_nhan')).args,
      [1],
    );
  });
});
test('inbox validates empty and oversized text, request IDs, cursors and thread IDs', async () => {
  dbStub();
  await serverTest(async (request) => {
    for (const noi_dung of ['', '  ', 'a'.repeat(5001), null])
      assert.equal(
        (await request('mine', 1, { noi_dung, request_id: 'request_123' }))
          .status,
        400,
      );
    assert.equal(
      (await request('mine', 1, { noi_dung: 'Hello', request_id: 'bad' }))
        .status,
      400,
    );
    for (const path of [
      'mine?before=-1',
      'mine?after=oops',
      'mine?before=2&after=3',
      'threads/nope',
    ])
      assert.equal((await request(path, 2)).status, 400);
  });
});
test('inbox paginates history and incremental updates without losing boundary messages', async () => {
  dbStub();
  const base = pool.query;
  pool.query = async (sql, args) =>
    sql.includes('ORDER BY n.ma_tin_nhan')
      ? [
          Array.from({ length: 51 }, (_, i) => ({
            ma_tin_nhan: String(sql.includes(' ASC') ? i + 1 : 51 - i),
          })),
        ]
      : base(sql, args);
  await serverTest(async (request) => {
    const history = (await (await request('mine')).json()).data;
    assert.equal(history.hasMore, true);
    assert.equal(history.messages.length, 50);
    assert.equal(history.messages[0].ma_tin_nhan, '2');
    assert.equal(history.messages.at(-1).ma_tin_nhan, '51');
    const recent = (await (await request('mine?after=1')).json()).data;
    assert.equal(recent.messages[0].ma_tin_nhan, '1');
    assert.equal(recent.messages.at(-1).ma_tin_nhan, '50');
  });
});
test(
  'inbox migration preserves legacy contacts, order, replies and is repeatable',
  { skip: process.env.INBOX_INTEGRATION !== '1' },
  async () => {
    const connection = await pool.getConnection();
    const name = `inbox_test_${Date.now()}`;
    try {
      await connection.query(`CREATE DATABASE \`${name}\``);
      await connection.query(`USE \`${name}\``);
      await connection.query(
        'CREATE TABLE tai_khoan (ma_tai_khoan INT PRIMARY KEY,ten_dang_nhap VARCHAR(50),ho_ten VARCHAR(100),vai_tro VARCHAR(20),trang_thai VARCHAR(20),token_version INT DEFAULT 0)',
      );
      await connection.query(
        "INSERT INTO tai_khoan VALUES (1,'customer','Customer','KhachHang','HoatDong',0),(2,'admin','Admin','Admin','HoatDong',0)",
      );
      await connection.query(
        'CREATE TABLE lien_he(ma_lien_he INT,ma_tai_khoan INT,tieu_de VARCHAR(200),noi_dung TEXT,phan_hoi TEXT,ngay_gui DATETIME,ngay_phan_hoi DATETIME)',
      );
      await connection.query(
        "INSERT INTO lien_he VALUES (1,1,'Question','Hello','Reply','2026-01-01','2026-01-02'),(2,NULL,'Guest','Guest text',NULL,'2026-01-01',NULL)",
      );
      await migrateInbox(connection);
      await migrateInbox(connection);
      const [rows] = await connection.query(
        'SELECT * FROM tin_nhan_ho_tro ORDER BY ma_tin_nhan',
      );
      assert.equal(rows.length, 2);
      assert.equal(rows[0].ben_gui, 'KhachHang');
      assert.equal(rows[1].noi_dung, 'Reply');
      const [old] = await connection.query('SELECT * FROM lien_he');
      assert.equal(old.length, 2);
      for (let i = 0; i < 2; i++)
        await connection.query(
          "INSERT INTO tin_nhan_ho_tro(ma_khach_hang,ma_nguoi_gui,ben_gui,noi_dung,request_id) VALUES (1,1,'KhachHang','Retry','retry_123') ON DUPLICATE KEY UPDATE ma_tin_nhan=LAST_INSERT_ID(ma_tin_nhan)",
        );
      const [[{ count }]] = await connection.query(
        'SELECT COUNT(*) AS count FROM tin_nhan_ho_tro',
      );
      assert.equal(count, 3);
      pool.query = connection.query.bind(connection);
      pool.execute = connection.execute.bind(connection);
      await serverTest(async (request) => {
        const message = {
          noi_dung: 'Customer API roundtrip',
          request_id: 'roundtrip_123',
          ma_khach_hang: 2,
        };
        assert.equal((await request('mine', 1, message)).status, 200);
        assert.equal((await request('mine', 1, message)).status, 200);
        const threads = (await (await request('threads', 2)).json()).data;
        assert.equal(threads.length, 1);
        assert.equal(threads[0].ma_tai_khoan, 1);
        const pendingCount = async () => (await (await request('pending-count', 2)).json()).data.count;
        assert.equal(await pendingCount(), 1);
        const history = (await (await request('threads/1', 2)).json()).data;
        assert.equal(history.messages.length, 4);
        const upper = history.messages.at(-1).ma_tin_nhan;
        assert.equal(
          (await request('threads/1/read', 2, { up_to: upper })).status,
          200,
        );
        assert.equal(await pendingCount(), 1);
        const receipt = (await (await request(`mine?after=${upper}`, 1)).json())
          .data;
        assert.equal(receipt.seenThrough, upper);
        assert.equal(
          (
            await request('threads/1', 2, {
              noi_dung: 'Seller API reply',
              request_id: 'seller_123',
            })
          ).status,
          200,
        );
        const fresh = (await (await request(`mine?after=${upper}`, 1)).json())
          .data;
        assert.equal(await pendingCount(), 0);
        assert.equal(fresh.messages.length, 1);
        assert.equal(fresh.messages[0].ben_gui, 'CuaHang');
        const other = (await (await request('mine', 2)).json()).data;
        assert.equal(other.messages.length, 0);
        // Numeric ID ordering must survive the JSON string cast (2, 10, 100).
        for (let i = 0; i < 105; i++) {
          await connection.execute(
            "INSERT INTO tin_nhan_ho_tro(ma_khach_hang,ben_gui,noi_dung) VALUES (1,'KhachHang',?)",
            [`Message ${i}`],
          );
        }
        const [[{ total, last }]] = await connection.query(
          'SELECT COUNT(*) AS total,MAX(ma_tin_nhan) AS last FROM tin_nhan_ho_tro',
        );
        const all = [];
        let before;
        do {
          const batch = (
            await (
              await request(`mine${before ? `?before=${before}` : ''}`, 1)
            ).json()
          ).data;
          const ids = batch.messages.map((m) => Number(m.ma_tin_nhan));
          assert.deepEqual(
            ids,
            [...ids].sort((a, b) => a - b),
          );
          all.unshift(...ids);
          before = batch.hasMore ? ids[0] : null;
        } while (before);
        assert.equal(new Set(all).size, total);
        assert.deepEqual(
          all,
          [...all].sort((a, b) => a - b),
        );
        assert.equal(all.at(-1), last);
        const incremental = (await (await request('mine?after=1', 1)).json())
          .data;
        const expected = all.filter((id) => id > 1).slice(0, 50);
        assert.deepEqual(
          incremental.messages.map((m) => Number(m.ma_tin_nhan)),
          expected,
        );
        await connection.query("INSERT INTO tai_khoan VALUES (3,'other','Other','KhachHang','HoatDong',0)");
        await connection.query("INSERT INTO tin_nhan_ho_tro(ma_khach_hang,ben_gui,noi_dung) VALUES (3,'KhachHang','Newer question'),(3,'CuaHang','Already answered')");
        const prioritized = (await (await request('threads', 2)).json()).data;
        assert.deepEqual(prioritized.map(thread => thread.ma_tai_khoan), [1, 3]);
        assert.equal(await pendingCount(), 1);
        const filtered = (await (await request('threads?search=Other', 2)).json()).data;
        assert.deepEqual(filtered.map(thread => thread.ma_tai_khoan), [3]);
        await connection.query("INSERT INTO tin_nhan_ho_tro(ma_khach_hang,ben_gui,noi_dung) VALUES (3,'KhachHang','Follow-up'),(3,'KhachHang','Another question')");
        assert.equal(await pendingCount(), 2);
      });
    } finally {
      await connection.query(
        `USE \`${process.env.DB_NAME || 'dien_gia_dung'}\``,
      );
      await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
      connection.release();
    }
  },
);
