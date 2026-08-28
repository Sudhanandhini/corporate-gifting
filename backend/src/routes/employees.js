import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/employees?search=
router.get('/', async (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, email, created_at
       FROM employees
      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
      ORDER BY id DESC`,
    [search, search, search]
  );
  res.json(rows);
});

// POST /api/employees   { first_name, last_name, email }
router.post('/', async (req, res) => {
  const first_name = String(req.body.first_name || '').trim();
  const last_name = String(req.body.last_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!first_name || !last_name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'First name, last name and a valid email are required.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO employees (first_name, last_name, email) VALUES (?, ?, ?)',
      [first_name, last_name, email]
    );
    res.status(201).json({ id: result.insertId, first_name, last_name, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An employee with that email already exists.' });
    }
    throw err;
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const first_name = String(req.body.first_name || '').trim();
  const last_name = String(req.body.last_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!first_name || !last_name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'First name, last name and a valid email are required.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE employees SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [first_name, last_name, email, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ id, first_name, last_name, email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An employee with that email already exists.' });
    }
    throw err;
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [Number(req.params.id)]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ ok: true });
});

export default router;
