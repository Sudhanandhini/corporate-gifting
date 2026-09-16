import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { sendOrderEmails } from '../mailer.js';
import { MULTI_ORDER_EMAILS } from '../lib/multiOrderAllowlist.js';

const router = Router();
export const STATUSES = ['Submitted', 'Processing', 'Completed', 'Cancelled'];
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

// Shared by the Orders list and the Excel export so both apply identical filters.
export function buildOrdersFilter({ search = '', status = '', dateFrom = '', dateTo = '', deleted = '' }) {
  search = `%${String(search).trim()}%`;
  status = String(status).trim();
  dateFrom = String(dateFrom).trim();
  dateTo = String(dateTo).trim();

  const where = [
    '(o.order_code LIKE ? OR o.recipient_name LIKE ? OR o.gift_name LIKE ?)',
    String(deleted) === '1' ? 'o.deleted_at IS NOT NULL' : 'o.deleted_at IS NULL',
  ];
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

// Atomically increments the order_counter row and returns the new value via
// MySQL's LAST_INSERT_ID(expr) trick — safe under concurrent requests, and
// immune to the string-parsing corruption the old MAX(order_code) approach
// was prone to.
async function nextOrderCode(conn) {
  await conn.query('UPDATE order_counter SET next_number = LAST_INSERT_ID(next_number + 1) WHERE id = 1');
  const [[{ n }]] = await conn.query('SELECT LAST_INSERT_ID() AS n');
  return `ORD-${n}`;
}

// POST /api/orders  — created by the client workflow
router.post('/', async (req, res) => {
  const b = req.body || {};
  const required = ['gift_name', 'recipient_name', 'last_name', 'phone', 'employee_id', 'entity', 'address', 'city', 'state', 'pincode'];
  for (const f of required) {
    if (!String(b[f] || '').trim()) {
      return res.status(400).json({ error: `Field "${f}" is required.` });
    }
  }

  const client_email = String(b.client_email || '').trim().toLowerCase();

  const conn = await pool.getConnection();
  try {
    if (client_email && !MULTI_ORDER_EMAILS.has(client_email)) {
      const [dupe] = await conn.query(
        'SELECT order_code FROM orders WHERE client_email = ? AND deleted_at IS NULL LIMIT 1',
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
      last_name: String(b.last_name).trim(),
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
        (order_code, gift_id, gift_name, quantity, recipient_name, last_name, client_email,
         phone, employee_id, entity, address, city, state, pincode, gift_message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        order_code,
        b.gift_id || null,
        orderForEmail.gift_name,
        orderForEmail.quantity,
        orderForEmail.recipient_name,
        orderForEmail.last_name,
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

const PAGE_SIZE = 15;

// GET /api/orders?search=&status=&dateFrom=&dateTo=&deleted=&page=  — admin only
router.get('/', requireAdmin, async (req, res) => {
  const { where, params } = buildOrdersFilter(req.query);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM orders o WHERE ${where}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT o.id, o.order_code, o.gift_name, o.quantity, o.recipient_name, o.last_name,
            o.client_email, o.phone, o.employee_id, o.entity, o.address, o.city, o.state, o.pincode,
            o.gift_message, o.status, o.created_at, o.deleted_at
       FROM orders o
      WHERE ${where}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset]
  );
  res.json({ rows, total, page, pageSize: PAGE_SIZE });
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

// DELETE /api/orders/:id  — admin soft-deletes an order (recoverable via restore)
router.delete('/:id', requireAdmin, async (req, res) => {
  const [result] = await pool.query(
    'UPDATE orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [Number(req.params.id)]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found.' });
  res.json({ id: Number(req.params.id), deleted: true });
});

// POST /api/orders/:id/restore  — admin undoes a soft delete
router.post('/:id/restore', requireAdmin, async (req, res) => {
  const [result] = await pool.query(
    'UPDATE orders SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL',
    [Number(req.params.id)]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Deleted order not found.' });
  res.json({ id: Number(req.params.id), deleted: false });
});

// DELETE /api/orders/:id/permanent  — admin permanently erases an already-removed
// order. Only reachable from the trash (deleted_at IS NOT NULL) so an order can't
// be wiped without first going through the recoverable soft-delete step.
router.delete('/:id/permanent', requireAdmin, async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM orders WHERE id = ? AND deleted_at IS NOT NULL',
    [Number(req.params.id)]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Removed order not found.' });
  res.json({ id: Number(req.params.id), permanentlyDeleted: true });
});

export default router;
