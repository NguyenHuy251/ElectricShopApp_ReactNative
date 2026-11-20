import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { pool } from '../dist/config/database.js';
import { confirmDonHang } from '../dist/services/donHang.service.js';
import { updateTrangThaiDonHang } from '../dist/controllers/donHang.controller.js';
import { migrateOrderConfirmation } from '../scripts/migrate-order-confirmation.mjs';

const originalConnection = pool.getConnection;
test.afterEach(() => {
  pool.getConnection = originalConnection;
});
test.after(() => pool.end());
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('order confirmation records the authenticated actor atomically and ignores client-supplied attribution', async () => {
  const events = [];
  pool.getConnection = async () => ({
    beginTransaction: async () => events.push('begin'),
    query: async (sql, args) => {
      if (sql.includes('FROM don_hang')) {
        assert.deepEqual(args, [10]);
        assert.match(sql, /FOR UPDATE/);
        return [[{ trang_thai: 'ChoXacNhan' }]];
      }
      assert.deepEqual(args, [7]);
      return [[{ ten_nhan_vien_xac_nhan: 'Nhân viên thật' }]];
    },
    execute: async (sql, args) => {
      assert.deepEqual(args, [7, 'Nhân viên thật', 10]);
      assert.match(
        sql,
        /trang_thai='DaXacNhan'.*ma_tai_khoan_xac_nhan=.*ngay_xac_nhan=NOW\(\)/s,
      );
      events.push('write');
      return [{ affectedRows: 1 }];
    },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  });
  const res = response();
  await updateTrangThaiDonHang(
    {
      params: { id: '10' },
      user: { ma_tai_khoan: 7, vai_tro: 'NhanVien', permissions: ['orders'] },
      body: {
        trang_thai: 'DaXacNhan',
        ma_tai_khoan_xac_nhan: 999,
        ten_nhan_vien_xac_nhan: 'Giả mạo',
      },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.ma_tai_khoan_xac_nhan, 7);
  assert.equal(res.body.data.ten_nhan_vien_xac_nhan, 'Nhân viên thật');
  assert.deepEqual(events, ['begin', 'write', 'commit', 'release']);
});

test('failed confirmation rolls back both attribution and status, while missing sessions and bad IDs never connect', async () => {
  let rollbacks = 0,
    releases = 0;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    query: async (sql) =>
      sql.includes('FROM don_hang')
        ? [[{ trang_thai: 'ChoXacNhan' }]]
        : [[{ ten_nhan_vien_xac_nhan: 'Admin' }]],
    execute: async () => {
      throw new Error('Storage unavailable');
    },
    commit: async () => assert.fail('Must not commit'),
    rollback: async () => rollbacks++,
    release: () => releases++,
  });
  await assert.rejects(() => confirmDonHang(10, 1), /Storage unavailable/);
  assert.equal(rollbacks, 1);
  assert.equal(releases, 1);
  pool.getConnection = () => assert.fail('Must reject before database access');
  const noSession = response();
  await updateTrangThaiDonHang(
    { params: { id: '10' }, body: { trang_thai: 'DaXacNhan' } },
    noSession,
  );
  assert.equal(noSession.statusCode, 401);
  const invalid = response();
  await updateTrangThaiDonHang(
    {
      params: { id: 'invalid' },
      user: { ma_tai_khoan: 7 },
      body: { trang_thai: 'DaXacNhan' },
    },
    invalid,
  );
  assert.equal(invalid.statusCode, 400);
});

test(
  'confirmation migration, concurrent actors and snapshots work in an isolated database',
  { skip: process.env.ORDER_CONFIRMATION_INTEGRATION !== '1' },
  async () => {
    const name = `electric_order_confirmation_test_${Date.now()}_${process.pid}`;
    const control = await originalConnection.call(pool);
    let db;
    try {
      await control.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
      db = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: name,
        connectionLimit: 4,
      });
      await db.query(
        'CREATE TABLE tai_khoan(ma_tai_khoan INT PRIMARY KEY,ho_ten VARCHAR(100),ten_dang_nhap VARCHAR(50),trang_thai VARCHAR(20))',
      );
      await db.query(
        'CREATE TABLE nhan_vien(ma_tai_khoan INT,ho_ten VARCHAR(100))',
      );
      await db.query(
        'CREATE TABLE don_hang(ma_don_hang INT PRIMARY KEY,trang_thai VARCHAR(20),ma_nhan_vien INT NULL)',
      );
      await db.query(
        "INSERT INTO tai_khoan VALUES (1,'Quản trị','admin','HoatDong'),(2,'Tên tài khoản','staff','HoatDong')",
      );
      await db.query("INSERT INTO nhan_vien VALUES (2,'Tên nhân viên')");
      await db.query(
        "INSERT INTO don_hang VALUES (1,'ChoXacNhan',99),(2,'DaXacNhan',99),(3,'ChoXacNhan',NULL),(4,'ChoXacNhan',NULL)",
      );
      await migrateOrderConfirmation(db);
      await migrateOrderConfirmation(db);
      pool.getConnection = db.getConnection.bind(db);
      const [old] = await db.query(
        'SELECT * FROM don_hang WHERE ma_don_hang=2',
      );
      assert.equal(old[0].ma_tai_khoan_xac_nhan, null);
      assert.equal(old[0].ten_nhan_vien_xac_nhan, null);
      assert.equal(old[0].ma_nhan_vien, 99);
      const results = await Promise.allSettled([
        confirmDonHang(1, 1),
        confirmDonHang(1, 2),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      const failure = results.find((r) => r.status === 'rejected');
      assert.equal(failure.reason.status, 409);
      const winner = results.find((r) => r.status === 'fulfilled').value;
      const [[saved]] = await db.query(
        'SELECT * FROM don_hang WHERE ma_don_hang=1',
      );
      assert.equal(saved.ma_tai_khoan_xac_nhan, winner.ma_tai_khoan_xac_nhan);
      assert.equal(saved.ten_nhan_vien_xac_nhan, winner.ten_nhan_vien_xac_nhan);
      assert.ok(saved.ngay_xac_nhan);
      assert.equal(saved.trang_thai, 'DaXacNhan');
      await confirmDonHang(3, 2);
      await db.query(
        "UPDATE nhan_vien SET ho_ten='Đã đổi tên' WHERE ma_tai_khoan=2",
      );
      const [[snapshot]] = await db.query(
        'SELECT ten_nhan_vien_xac_nhan FROM don_hang WHERE ma_don_hang=3',
      );
      assert.equal(snapshot.ten_nhan_vien_xac_nhan, 'Tên nhân viên');
      await db.query(
        "UPDATE don_hang SET trang_thai='DangGiao' WHERE ma_don_hang=3",
      );
      await assert.rejects(
        () => confirmDonHang(3, 1),
        (e) => e.status === 409,
      );
      await assert.rejects(
        () => confirmDonHang(999, 1),
        (e) => e.status === 404,
      );
      await assert.rejects(
        () => confirmDonHang(4, 999),
        (e) => e.status === 401,
      );
      const [[unchanged]] = await db.query(
        'SELECT trang_thai,ma_tai_khoan_xac_nhan FROM don_hang WHERE ma_don_hang=4',
      );
      assert.equal(unchanged.trang_thai, 'ChoXacNhan');
      assert.equal(unchanged.ma_tai_khoan_xac_nhan, null);
    } finally {
      pool.getConnection = originalConnection;
      if (db) await db.end();
      await control.query(`DROP DATABASE IF EXISTS \`${name}\``);
      control.release();
    }
  },
);
