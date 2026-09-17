import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { ping, closePool, ensureGiftsSortOrder, ensureOrderCounter, ensureOrdersDeletedAt, ensureEmployeesEmployeeId, ensureReportsStatus, ensureIndexes } from './db.js';
import { connectRedis, isRedisReady } from './redis.js';
import authRoutes from './routes/auth.js';
import giftRoutes from './routes/gifts.js';
import employeeRoutes from './routes/employees.js';
import orderRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Only trust X-Forwarded-For in production, where this sits behind a real
// reverse proxy — otherwise a client could spoof it to dodge rate limiting.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Gzips JSON API responses and text-based static files; already-compressed
// formats (jpeg/png/webp/gif uploads) are skipped automatically via the
// compressible mime-type check, so this doesn't waste CPU re-compressing them.
app.use(compression());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api', apiLimiter);

app.get('/api/health', async (_req, res) => {
  try {
    await ping();
    res.json({ ok: true, db: 'up', cache: isRedisReady() ? 'up' : 'down' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'down', error: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/employees', requireAdmin, employeeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', requireAdmin, dashboardRoutes);
app.use('/api/reports', requireAdmin, reportRoutes);

// Centralised error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Redis is best-effort and connects in the background (see redis.js) — it's
// deliberately not in this Promise.all so a missing/slow Redis never delays
// the server coming up.
connectRedis();

Promise.all([
  ensureGiftsSortOrder().catch((e) => console.error('Failed to ensure gifts.sort_order column:', e)),
  ensureOrderCounter().catch((e) => console.error('Failed to ensure order_counter table:', e)),
  ensureOrdersDeletedAt().catch((e) => console.error('Failed to ensure orders.deleted_at column:', e)),
  ensureEmployeesEmployeeId().catch((e) => console.error('Failed to ensure employees.employee_id column:', e)),
  ensureReportsStatus().catch((e) => console.error('Failed to ensure reports.status column:', e)),
])
  // Runs only after the columns above exist — several of these indexes are on
  // columns (orders.deleted_at, gifts.sort_order) that those migrations add.
  .then(() => ensureIndexes().catch((e) => console.error('Failed to ensure indexes:', e)))
  .finally(() => {
    const server = app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });

    // Stop taking new connections and let in-flight requests finish before
    // closing the MySQL pool, instead of yanking active queries mid-flight.
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await closePool().catch((e) => console.error('Error closing MySQL pool:', e));
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
