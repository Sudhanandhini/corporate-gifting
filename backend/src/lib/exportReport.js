import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { pool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const reportsDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

// Writes an ExcelJS workbook under uploads/reports and records it in the
// shared `reports` table, so exports from any admin screen (Orders,
// Employees, ...) all show up together in the Reports page.
export async function saveReport(wb, { prefix, date_from = null, date_to = null, status_filter = null, search_filter = null, row_count }) {
  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.xlsx`;
  await wb.xlsx.writeFile(path.join(reportsDir, filename));
  const file_url = `/uploads/reports/${filename}`;

  const [result] = await pool.query(
    `INSERT INTO reports (filename, file_url, date_from, date_to, status_filter, search_filter, row_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [filename, file_url, date_from, date_to, status_filter, search_filter, row_count]
  );
  const [[report]] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
  return report;
}
