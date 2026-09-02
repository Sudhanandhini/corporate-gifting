import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (_req, res) => {
  const [[emp]] = await pool.query('SELECT COUNT(*) AS c FROM employees');
  const [[tot]] = await pool.query('SELECT COUNT(*) AS c FROM orders');
  const [[pending]] = await pool.query(
    "SELECT COUNT(*) AS c FROM orders WHERE status NOT IN ('Completed', 'Cancelled')"
  );
  const [[done]] = await pool.query(
    "SELECT COUNT(*) AS c FROM orders WHERE status = 'Completed'"
  );

  const [recent] = await pool.query(
    `SELECT order_code, recipient_name, gift_name, status, created_at
       FROM orders ORDER BY id DESC LIMIT 5`
  );

  // Orders per day for the last 7 days (oldest -> newest)
  const [daily] = await pool.query(
    `SELECT DATE(created_at) AS d, COUNT(*) AS c
       FROM orders
      WHERE created_at >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(created_at)`
  );
  const dailyMap = Object.fromEntries(daily.map((r) => [r.d, Number(r.c)]));
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    last7.push({
      date: key,
      label: dt.toLocaleDateString('en-US', { weekday: 'short' })[0],
      count: dailyMap[key] || 0,
    });
  }

  const total = tot.c || 0;
  const completedPct = total ? Math.round((done.c / total) * 100) : 0;

  res.json({
    kpis: {
      totalEmployees: emp.c,
      totalOrders: tot.c,
      pendingOrders: pending.c,
      completedOrders: done.c,
    },
    recentOrders: recent,
    last7Days: last7,
    statusBreakdown: {
      completed: done.c,
      pending: pending.c,
      completedPct,
      pendingPct: 100 - completedPct,
      total,
    },
  });
});

export default router;
