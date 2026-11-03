import mysql from "mysql2/promise";
const globalDb = globalThis;
export const db =
  globalDb.shareDb ||
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 6,
    charset: "utf8mb4",
    dateStrings: true,
  });
if (process.env.NODE_ENV !== "production") globalDb.shareDb = db;
export async function q(sql, args = [], conn = db) {
  const [rows] = await conn.execute(sql, args);
  return rows;
}
export async function tx(fn) {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const r = await fn(c);
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
