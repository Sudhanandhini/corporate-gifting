import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { sendOrderEmails } from '../mailer.js';

const router = Router();
export const STATUSES = ['Submitted', 'Processing', 'Completed', 'Cancelled'];
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

// Shared by the Orders list and the Excel export so both apply identical filters.
export function buildOrdersFilter({ search = '', status = '', dateFrom = '', dateTo = '' }) {
  search = `%${String(search).trim()}%`;
  status = String(status).trim();
  dateFrom = String(dateFrom).trim();
  dateTo = String(dateTo).trim();

  const where = ['(o.order_code LIKE ? OR o.recipient_name LIKE ? OR o.gift_name LIKE ?)'];
  const params = [search, search, search];

  if (STATUSES.includes(status)) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (isDate(dateFrom) && isDate(dateTo)) {
    where.push('DATE(o.created_at) BETWEEN ? AND ?');
    params.push(dateFrom, dateTo);
  } else if (isDate(dateFrom)) {
    where.push('DATE(o.created_at) >= ?');
    params.push(dateFrom);
  } else if (isDate(dateTo)) {
    where.push('DATE(o.created_at) <= ?');
    params.push(dateTo);
  }

  return { where: where.join(' AND '), params, dateFrom: isDate(dateFrom) ? dateFrom : null, dateTo: isDate(dateTo) ? dateTo : null, status: STATUSES.includes(status) ? status : null };
}

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
  const required = ['gift_name', 'recipient_name', 'phone', 'employee_id', 'entity', 'address', 'city', 'state', 'pincode'];
  for (const f of required) {
    if (!String(b[f] || '').trim()) {
      return res.status(400).json({ error: `Field "${f}" is required.` });
    }
  }

  const client_email = String(b.client_email || '').trim().toLowerCase();

  const conn = await pool.getConnection();
  try {
    if (client_email) {
      const [dupe] = await conn.query(
        'SELECT order_code FROM orders WHERE client_email = ? LIMIT 1',
        [client_email]
      );
      if (dupe.length > 0) {
        return res.status(409).json({ error: 'An order has already been placed with this email address.' });
      }
    }

    const order_code = await nextOrderCode(conn);
    const orderForEmail = {
      order_code,
      gift_name: String(b.gift_name).trim(),
      quantity: Number(b.quantity) || 1,
      recipient_name: String(b.recipient_name).trim(),
      client_email,
      phone: String(b.phone).trim(),
      employee_id: String(b.employee_id).trim(),
      entity: String(b.entity).trim(),
      address: String(b.address).trim(),
      city: String(b.city).trim(),
      state: String(b.state).trim(),
      pincode: String(b.pincode).trim(),
      gift_message: b.gift_message ? String(b.gift_message).trim() : null,
      status: 'Submitted',
    };
    const [result] = await conn.query(
      `INSERT INTO orders
        (order_code, gift_id, gift_name, quantity, recipient_name, client_email,
         phone, employee_id, entity, address, city, state, pincode, gift_message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        order_code,
        b.gift_id || null,
        orderForEmail.gift_name,
        orderForEmail.quantity,
        orderForEmail.recipient_name,
        client_email,
        orderForEmail.phone,
        orderForEmail.employee_id,
        orderForEmail.entity,
        orderForEmail.address,
        orderForEmail.city,
        orderForEmail.state,
        orderForEmail.pincode,
        orderForEmail.gift_message,
      ]
    );
    res.status(201).json({ id: result.insertId, order_code, status: 'Submitted' });

    // Confirmation to the client + notification to the admin inbox. Fired
    // after responding so a slow/failed SMTP call never delays or breaks
    // an order that already succeeded.
    sendOrderEmails(orderForEmail).catch((e) => console.error('Order email dispatch failed:', e));
  } finally {
    conn.release();
  }
});

// GET /api/orders?search=&status=&dateFrom=&dateTo=  — admin only
router.get('/', requireAdmin, async (req, res) => {
  const { where, params } = buildOrdersFilter(req.query);
  const [rows] = await pool.query(
    `SELECT o.id, o.order_code, o.gift_name, o.quantity, o.recipient_name,
            o.client_email, o.phone, o.employee_id, o.entity, o.address, o.city, o.state, o.pincode,
            o.gift_message, o.status, o.created_at
       FROM orders o
      WHERE ${where}
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
