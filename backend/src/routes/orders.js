import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
const STATUSES = ['Submitted', 'Processing', 'Completed'];

async function nextOrderCode(conn) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(order_code, 5) AS UNSIGNED)), 1000) AS maxn
       FROM orders WHERE order_code LIKE 'ORD-%'`
  );
  return `ORD-${(rows[0].maxn || 1000) + 1}`;
}

// POST /api/orders  — created by the client workflow
router.post('/', async (req, res) => {
  const b = req.body || {};
  const required = ['gift_name', 'recipient_name', 'phone', 'address', 'city', 'state', 'pincode'];
  for (const f of required) {
    if (!String(b[f] || '').trim()) {
      return res.status(400).json({ error: `Field "${f}" is required.` });
    }
  }

  const conn = await pool.getConnection();
  try {
    const order_code = await nextOrderCode(conn);
    const [result] = await conn.query(
      `INSERT INTO orders
        (order_code, gift_id, gift_name, quantity, recipient_name, client_email,
         phone, address, city, state, pincode, gift_message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        order_code,
        b.gift_id || null,
        String(b.gift_name).trim(),
        Number(b.quantity) || 1,
        String(b.recipient_name).trim(),
        String(b.client_email || '').trim().toLowerCase(),
        String(b.phone).trim(),
        String(b.address).trim(),
        String(b.city).trim(),
        String(b.state).trim(),
        String(b.pincode).trim(),
        b.gift_message ? String(b.gift_message).trim() : null,
      ]
    );
    res.status(201).json({ id: result.insertId, order_code, status: 'Submitted' });
  } finally {
    conn.release();
  }
});

// GET /api/orders?search=&status=&date=  — admin only
router.get('/', requireAdmin, async (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const status = String(req.query.status || '').trim();
  const date = String(req.query.date || '').trim(); // YYYY-MM-DD

  const where = ['(o.order_code LIKE ? OR o.recipient_name LIKE ? OR o.gift_name LIKE ?)'];
  const params = [search, search, search];

  if (STATUSES.includes(status)) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    where.push('DATE(o.created_at) = ?');
    params.push(date);
  }

  const [rows] = await pool.query(
    `SELECT o.id, o.order_code, o.gift_name, o.quantity, o.recipient_name,
            o.client_email, o.phone, o.address, o.city, o.state, o.pincode,
            o.gift_message, o.status, o.created_at
       FROM orders o
      WHERE ${where.join(' AND ')}
      ORDER BY o.id DESC`,
    params
  );
  res.json(rows);
});

// GET /api/orders/:id — admin only
router.get('/:id', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
  res.json(rows[0]);
});

// PUT /api/orders/:id  — admin edits status
router.put('/:id', requireAdmin, async (req, res) => {
  const status = String(req.body.status || '').trim();
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}.` });
  }
  const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [
    status,
    Number(req.params.id),
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found.' });
  res.json({ id: Number(req.params.id), status });
});

export default router;
