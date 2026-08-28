import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { ping } from './db.js';
import authRoutes from './routes/auth.js';
import giftRoutes from './routes/gifts.js';
import employeeRoutes from './routes/employees.js';
import orderRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import { requireAdmin } from './middleware/requireAdmin.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await ping();
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'down', error: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/employees', requireAdmin, employeeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', requireAdmin, dashboardRoutes);

// Centralised error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
