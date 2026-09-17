import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { pool } from '../db.js';
import { invalidateCache } from '../middleware/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const reportsDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

// Inserts a placeholder row (status 'pending') so the route can respond to
// the request immediately, instead of blocking on the query + spreadsheet
// build below. filename/file_url are NOT NULL columns with no real value
// yet, so they get a harmless placeholder until runReport() fills them in.
export async function createPendingReport({ prefix, date_from = null, date_to = null, status_filter = null, search_filter = null }) {
  const [result] = await pool.query(
    `INSERT INTO reports (filename, file_url, date_from, date_to, status_filter, search_filter, row_count, status)
     VALUES (?, '', ?, ?, ?, ?, 0, 'pending')`,
    [`${prefix}-pending`, date_from, date_to, status_filter, search_filter]
  );
  const [[report]] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
  await invalidateCache('reports');
  return report;
}

// Runs after the request has already been responded to: calls `build()` (which
// must return { wb: ExcelJS.Workbook, row_count }), writes the file, and flips
// the pending row to 'ready' — or 'failed' if build() throws. Never awaited by
// the route handler, and catches its own errors so a failure here can't surface
// as an unhandled rejection.
export async function runReport(reportId, prefix, build) {
  try {
    const { wb, row_count } = await build();
    const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.xlsx`;
    await wb.xlsx.writeFile(path.join(reportsDir, filename));
    const file_url = `/uploads/reports/${filename}`;
    await pool.query(
      `UPDATE reports SET filename = ?, file_url = ?, row_count = ?, status = 'ready' WHERE id = ?`,
      [filename, file_url, row_count, reportId]
    );
  } catch (err) {
    console.error(`Report #${reportId} generation failed:`, err);
    await pool.query(`UPDATE reports SET status = 'failed' WHERE id = ?`, [reportId]).catch(() => {});
  } finally {
    await invalidateCache('reports').catch(() => {});
  }
}
