import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { pool } from '../db.js';
import { buildOrdersFilter } from './orders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const router = Router();

// Express 4 doesn't forward rejected promises from async handlers to the
// error middleware on its own — an uncaught rejection here would otherwise
// crash the whole process instead of just failing this one request.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/reports/export  { search?, status?, dateFrom?, dateTo? }
// Builds an .xlsx of the orders matching the given filters, saves it under
// uploads/reports, and records it in the reports table.
router.post('/export', ah(async (req, res) => {
  const body = req.body || {};
  const { where, params, dateFrom, dateTo, status } = buildOrdersFilter(body);
  const search = String(body.search || '').trim();

  const [rows] = await pool.query(
    `SELECT o.order_code, o.recipient_name, o.last_name, o.client_email, o.phone, o.employee_id, o.entity,
            o.gift_name, o.quantity, o.address, o.city, o.state, o.pincode,
            o.status, o.created_at
       FROM orders o
      WHERE ${where}
      ORDER BY o.id DESC`,
    params
  );

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Orders');
  sheet.columns = [
    { header: 'Order ID', key: 'order_code', width: 16 },
    { header: 'Recipient Name', key: 'recipient_name', width: 22 },
    { header: 'Last Name', key: 'last_name', width: 18 },
    { header: 'Employee ID', key: 'employee_id', width: 16 },
    { header: 'Entity', key: 'entity', width: 30 },
    { header: 'Email', key: 'client_email', width: 26 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Gift', key: 'gift_name', width: 22 },
    // { header: 'Qty', key: 'quantity', width: 6 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'City', key: 'city', width: 16 },
    { header: 'State', key: 'state', width: 16 },
    { header: 'Pincode', key: 'pincode', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Order Date', key: 'created_at', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow({ ...r, created_at: new Date(r.created_at) }));
  sheet.getColumn('created_at').numFmt = 'yyyy-mm-dd hh:mm';

  const filename = `orders-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.xlsx`;
  await wb.xlsx.writeFile(path.join(reportsDir, filename));
  const file_url = `/uploads/reports/${filename}`;

  const [result] = await pool.query(
    `INSERT INTO reports (filename, file_url, date_from, date_to, status_filter, search_filter, row_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [filename, file_url, dateFrom, dateTo, status, search || null, rows.length]
  );
  const [[report]] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
  res.status(201).json(report);
}));

// GET /api/reports — list generated exports, newest first
router.get('/', ah(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM reports ORDER BY id DESC');
  res.json(rows);
}));

// DELETE /api/reports/:id — remove a generated export and its file
router.delete('/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query('SELECT filename FROM reports WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
  await pool.query('DELETE FROM reports WHERE id = ?', [id]);
  fs.unlink(path.join(reportsDir, rows[0].filename), () => {});
  res.json({ ok: true });
}));

export default router;
