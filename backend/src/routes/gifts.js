import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import multer from 'multer';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'gifts');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed.'));
    }
    cb(null, true);
  },
});

const router = Router();

function removeImageFile(image_url) {
  if (!image_url) return;
  const file = path.join(uploadDir, path.basename(image_url));
  fs.unlink(file, () => {});
}

// GET /api/gifts — public, active gifts only (used by the client workflow)
router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, description, image_url FROM gifts WHERE active = 1 ORDER BY id'
  );
  res.json(rows);
});

// GET /api/gifts/admin — admin, all gifts including inactive
router.get('/admin', requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, description, image_url, active FROM gifts ORDER BY id DESC'
  );
  res.json(rows);
});

// POST /api/gifts — admin, create a gift (multipart/form-data: name, description, image?)
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required.' });
  }
  const image_url = req.file ? `/uploads/gifts/${req.file.filename}` : null;

  const [result] = await pool.query(
    'INSERT INTO gifts (name, description, image_url, active) VALUES (?, ?, ?, 1)',
    [name, description, image_url]
  );
  res.status(201).json({ id: result.insertId, name, description, image_url, active: 1 });
});

// PUT /api/gifts/:id — admin, update a gift (multipart/form-data)
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const active = req.body.active === '0' ? 0 : 1;
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required.' });
  }

  const [rows] = await pool.query('SELECT image_url FROM gifts WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Gift not found.' });

  const image_url = req.file ? `/uploads/gifts/${req.file.filename}` : rows[0].image_url;
  if (req.file) removeImageFile(rows[0].image_url);

  await pool.query(
    'UPDATE gifts SET name = ?, description = ?, image_url = ?, active = ? WHERE id = ?',
    [name, description, image_url, active, id]
  );
  res.json({ id, name, description, image_url, active });
});

// DELETE /api/gifts/:id — admin
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query('SELECT image_url FROM gifts WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Gift not found.' });

  await pool.query('DELETE FROM gifts WHERE id = ?', [id]);
  removeImageFile(rows[0].image_url);
  res.json({ ok: true });
});

export default router;
