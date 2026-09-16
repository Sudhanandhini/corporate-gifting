import { Router } from 'express';
import ExcelJS from 'exceljs';
import { pool } from '../db.js';
import { saveReport } from '../lib/exportReport.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_ID_RE = /^[A-Za-z0-9]{1,10}$/;

// Duplicate-key errors don't say which unique column collided in a
// version-independent way, so match the constrained column out of the
// driver's message instead of trusting a specific MySQL error format.
function dupEntryMessage(err) {
  if (err.sqlMessage && err.sqlMessage.includes('employee_id')) {
    return 'An employee with that Employee ID already exists.';
  }
  return 'An employee with that email already exists.';
}

// Each employee has at most one active (non-removed) order, so a correlated
// subquery picking their latest order id is enough to attach its status —
// no risk of the LEFT JOIN fanning a row out into duplicates.
const ORDER_STATUS_JOIN = `
  LEFT JOIN orders o
    ON o.id = (SELECT o2.id FROM orders o2
                WHERE o2.client_email = e.email AND o2.deleted_at IS NULL
                ORDER BY o2.id DESC LIMIT 1)`;

const PAGE_SIZE = 15;

// GET /api/employees?search=&page= — short TTL since order status (joined
// in from orders.js) can change independently of any employee write.
router.get('/', cacheMiddleware('employees', 20), async (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const where = 'e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?';
  const params = [search, search, search, search];

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM employees e WHERE ${where}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, e.created_at,
            o.status AS order_status
       FROM employees e
       ${ORDER_STATUS_JOIN}
      WHERE ${where}
      ORDER BY e.id DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset]
  );
  res.json({ rows, total, page, pageSize: PAGE_SIZE });
});

// POST /api/employees/export  { search? }
router.post('/export', async (req, res) => {
  try {
    const search = String((req.body || {}).search || '').trim();
    const like = `%${search}%`;
    const [rows] = await pool.query(
      `SELECT e.employee_id, e.first_name, e.last_name, e.email, e.created_at,
              o.status AS order_status
         FROM employees e
         ${ORDER_STATUS_JOIN}
        WHERE e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?
        ORDER BY e.id DESC`,
      [like, like, like, like]
    );

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Employees');
    sheet.columns = [
      { header: 'Employee ID', key: 'employee_id', width: 16 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'order_status', width: 16 },
      { header: 'Added On', key: 'created_at', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow({ ...r, order_status: r.order_status || 'Not Submitted', created_at: new Date(r.created_at) }));
    sheet.getColumn('created_at').numFmt = 'yyyy-mm-dd hh:mm';

    const report = await saveReport(wb, { prefix: 'employees', search_filter: search || null, row_count: rows.length });
    await invalidateCache('reports');
    res.status(201).json(report);
  } catch (err) {
    console.error('Employee export failed:', err);
    res.status(500).json({ error: 'Failed to export employees.' });
  }
});

// POST /api/employees   { employee_id, first_name, last_name, email }
router.post('/', async (req, res) => {
  const employee_id = String(req.body.employee_id || '').trim();
  const first_name = String(req.body.first_name || '').trim();
  const last_name = String(req.body.last_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!first_name || !last_name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'First name, last name and a valid email are required.' });
  }
  if (!EMPLOYEE_ID_RE.test(employee_id)) {
    return res.status(400).json({ error: 'Employee ID is required and must be up to 10 letters/digits only.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO employees (employee_id, first_name, last_name, email) VALUES (?, ?, ?, ?)',
      [employee_id, first_name, last_name, email]
    );
    await invalidateCache('employees', 'dashboard');
    res.status(201).json({ id: result.insertId, employee_id, first_name, last_name, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: dupEntryMessage(err) });
    }
    throw err;
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const employee_id = String(req.body.employee_id || '').trim();
  const first_name = String(req.body.first_name || '').trim();
  const last_name = String(req.body.last_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!first_name || !last_name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'First name, last name and a valid email are required.' });
  }
  if (!EMPLOYEE_ID_RE.test(employee_id)) {
    return res.status(400).json({ error: 'Employee ID is required and must be up to 10 letters/digits only.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE employees SET employee_id = ?, first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [employee_id, first_name, last_name, email, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found.' });
    await invalidateCache('employees', 'dashboard');
    res.json({ id, employee_id, first_name, last_name, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: dupEntryMessage(err) });
    }
    throw err;
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [Number(req.params.id)]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found.' });
  await invalidateCache('employees', 'dashboard');
  res.json({ ok: true });
});

export default router;
