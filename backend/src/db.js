import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'corporate_gifting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

export async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
  } finally {
    conn.release();
  }
}

// Adds gifts.sort_order for databases created before drag-to-reorder existed.
// schema.sql's CREATE TABLE IF NOT EXISTS is a no-op on an existing table, so
// this keeps already-deployed databases in sync without a migration runner.
export async function ensureGiftsSortOrder() {
  const [cols] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'gifts' AND column_name = 'sort_order'`
  );
  if (cols[0].c === 0) {
    await pool.query('ALTER TABLE gifts ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
    await pool.query('UPDATE gifts SET sort_order = id');
  }
}
