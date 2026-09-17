import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'corporate_gifting',
  dateStrings: true,

  // Pool sizing — queue rather than reject once all connections are busy,
  // with no cap on how many callers can wait (queueLimit: 0).
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  maxIdle: Number(process.env.DB_POOL_SIZE) || 10,
  queueLimit: 0,
  idleTimeout: 60_000,

  // Fails fast on a stuck connection attempt instead of hanging a request.
  connectTimeout: 10_000,
  // TCP keep-alive so idle pooled connections don't get silently dropped by
  // a firewall/load balancer between requests, which otherwise surfaces as
  // a confusing "Connection lost" error on the next query to reuse them.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
});

// mysql2's pool itself never emits 'error' for anything currently in this
// app's query patterns, but EventEmitter throws an uncaught exception if
// 'error' is ever emitted with no listener — this is a cheap safety net.
pool.on('error', (err) => console.error('MySQL pool error:', err));

// Lets connections drain before the process exits (see index.js), instead
// of the pool being torn down mid-query on a SIGTERM/SIGINT.
export async function closePool() {
  await pool.end();
}

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

// Adds reports.status for databases created before background report
// generation existed. Existing rows already have a real file on disk, so
// they default to 'ready' rather than being mistaken for in-progress.
export async function ensureReportsStatus() {
  const [cols] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'reports' AND column_name = 'status'`
  );
  if (cols[0].c === 0) {
    await pool.query("ALTER TABLE reports ADD COLUMN status ENUM('pending','ready','failed') NOT NULL DEFAULT 'ready'");
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

// table/indexName are always our own hardcoded call-site literals below,
// never request input, so building the ALTER string directly is safe —
// MySQL has no way to bind identifiers as query parameters.
async function ensureIndex(table, indexName, columnsSql) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName]
  );
  if (rows[0].c === 0) {
    await pool.query(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columnsSql})`);
  }
}

// Adds the composite indexes matching this app's actual hot-path queries
// (dashboard KPIs, the orders/employees dedupe & status lookups, the public
// gift catalogue) for databases created before they existed. schema.sql
// already has them for fresh installs; this keeps deployed databases in sync.
export async function ensureIndexes() {
  await ensureIndex('orders', 'idx_orders_deleted_status', 'deleted_at, status');
  await ensureIndex('orders', 'idx_orders_deleted_created', 'deleted_at, created_at');
  await ensureIndex('orders', 'idx_orders_client_email', 'client_email, deleted_at');
  await ensureIndex('otp_codes', 'idx_otp_email_code', 'email, code');
  await ensureIndex('gifts', 'idx_gifts_active_sort', 'active, sort_order');
}
