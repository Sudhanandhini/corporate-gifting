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

// Creates the order_code counter for databases that predate it, seeded to
// 2000 so the next generated order code is ORD-2001 regardless of whatever
// (possibly corrupted) order_code strings already exist.
export async function ensureOrderCounter() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS order_counter (
       id          TINYINT NOT NULL PRIMARY KEY,
       next_number INT NOT NULL
     ) ENGINE=InnoDB`
  );
  await pool.query('INSERT IGNORE INTO order_counter (id, next_number) VALUES (1, 2000)');
}

// Adds orders.deleted_at for databases created before soft-delete existed.
export async function ensureOrdersDeletedAt() {
  const [cols] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'deleted_at'`
  );
  if (cols[0].c === 0) {
    await pool.query('ALTER TABLE orders ADD COLUMN deleted_at DATETIME NULL, ADD INDEX idx_orders_deleted (deleted_at)');
  }
}

// Adds employees.employee_id for databases created before it existed.
export async function ensureEmployeesEmployeeId() {
  const [cols] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'employees' AND column_name = 'employee_id'`
  );
  if (cols[0].c === 0) {
    await pool.query('ALTER TABLE employees ADD COLUMN employee_id VARCHAR(40) NULL, ADD UNIQUE KEY uq_employees_employee_id (employee_id)');
  }
}
