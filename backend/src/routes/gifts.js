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
const MAX_FILE_MB = 20;
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed.'));
    }
    cb(null, true);
  },
});
const MAX_IMAGES = 20;

const router = Router();

// Express 4 doesn't forward rejected promises from async handlers to the
// error middleware on its own — an uncaught rejection here would otherwise
// crash the whole process instead of just failing this one request.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Reorders freshly-uploaded files (and their parallel per-image titles) to
// match the drag order the client sent (a JSON array of "new:<index>"
// tokens referring to positions in `files`).
function orderFiles(files, titles, imageOrderJson) {
  let order = [];
  try { order = JSON.parse(imageOrderJson || '[]'); } catch { order = []; }
  const newTokens = order.filter((t) => t.startsWith('new:'));
  if (newTokens.length !== files.length) return { files, titles };
  const idx = newTokens.map((t) => Number(t.split(':')[1]));
  if (!idx.every((i) => Number.isInteger(i) && files[i])) return { files, titles };
  return { files: idx.map((i) => files[i]), titles: idx.map((i) => titles[i] || null) };
}

function parseTitles(json, count) {
  let titles = [];
  try { titles = JSON.parse(json || '[]'); } catch { titles = []; }
  return Array.from({ length: count }, (_, i) => {
    const t = String(titles[i] || '').trim();
    return t || null;
  });
}

function removeImageFile(image_url) {
  if (!image_url) return;
  const file = path.join(uploadDir, path.basename(image_url));
  fs.unlink(file, () => {});
}

// Attaches each gift's gallery as `imageList` ({id, image_url, title}[]).
// Falls back to a single id-less entry wrapping the cover image for gifts
// created before galleries existed.
async function attachImageLists(rows) {
  if (rows.length === 0) return rows;
  const [galleryRows] = await pool.query(
    'SELECT id, gift_id, image_url, title FROM gift_images WHERE gift_id IN (?) ORDER BY gift_id, sort_order, id',
    [rows.map((r) => r.id)]
  );
  const byGift = new Map();
  for (const g of galleryRows) {
    if (!byGift.has(g.gift_id)) byGift.set(g.gift_id, []);
    byGift.get(g.gift_id).push({ id: g.id, image_url: g.image_url, title: g.title });
  }
  return rows.map((r) => ({
    ...r,
    imageList: byGift.get(r.id) || (r.image_url ? [{ id: null, image_url: r.image_url, title: null }] : []),
  }));
}

// GET /api/gifts — public, active gifts only (used by the client workflow)
router.get('/', ah(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, description, image_url FROM gifts WHERE active = 1 ORDER BY id'
  );
  const withImages = await attachImageLists(rows);
  res.json(withImages.map(({ imageList, ...r }) => ({
    ...r,
    images: imageList.map((i) => ({ url: i.image_url, title: i.title })),
  })));
}));

// GET /api/gifts/admin — admin, all gifts including inactive
router.get('/admin', requireAdmin, ah(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, description, image_url, active FROM gifts ORDER BY id DESC'
  );
  const withImages = await attachImageLists(rows);
  res.json(withImages.map(({ imageList, ...r }) => ({ ...r, images: imageList })));
}));

// POST /api/gifts — admin, create a gift (multipart/form-data: name, description, images[]?)
router.post('/', requireAdmin, upload.array('images', MAX_IMAGES), ah(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required.' });
  }
  const rawFiles = req.files || [];
  const rawTitles = parseTitles(req.body.newTitles, rawFiles.length);
  const { files, titles } = orderFiles(rawFiles, rawTitles, req.body.imageOrder);
  const image_url = files[0] ? `/uploads/gifts/${files[0].filename}` : null;

  const [result] = await pool.query(
    'INSERT INTO gifts (name, description, image_url, active) VALUES (?, ?, ?, 1)',
    [name, description, image_url]
  );
  const giftId = result.insertId;

  const images = files.map((f, i) => ({ url: `/uploads/gifts/${f.filename}`, title: titles[i] || null }));
  if (images.length) {
    await pool.query(
      'INSERT INTO gift_images (gift_id, image_url, title, sort_order) VALUES ?',
      [images.map((img, i) => [giftId, img.url, img.title, i])]
    );
  }

  res.status(201).json({ id: giftId, name, description, image_url, images, active: 1 });
}));

// PUT /api/gifts/:id — admin, update a gift (multipart/form-data)
// Body may also include removeImageIds (JSON array of gift_images.id to drop)
// and imageOrder (JSON array of "existing:<id>" / "new:<upload index>" tokens
// giving the final drag order of every image that remains).
router.put('/:id', requireAdmin, upload.array('images', MAX_IMAGES), ah(async (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const active = req.body.active === '0' ? 0 : 1;
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required.' });
  }

  const [giftRows] = await pool.query('SELECT image_url FROM gifts WHERE id = ?', [id]);
  if (giftRows.length === 0) return res.status(404).json({ error: 'Gift not found.' });

  let removeIds = [];
  try { removeIds = JSON.parse(req.body.removeImageIds || '[]'); } catch { removeIds = []; }
  removeIds = removeIds.map(Number).filter(Number.isFinite);
  const removeCover = req.body.removeCover === 'true';

  if (removeCover && giftRows[0].image_url) removeImageFile(giftRows[0].image_url);

  if (removeIds.length) {
    const [toRemove] = await pool.query(
      'SELECT image_url FROM gift_images WHERE id IN (?) AND gift_id = ?',
      [removeIds, id]
    );
    await pool.query('DELETE FROM gift_images WHERE id IN (?) AND gift_id = ?', [removeIds, id]);
    toRemove.forEach((r) => removeImageFile(r.image_url));
  }

  const files = req.files || [];
  const newTitles = parseTitles(req.body.newTitles, files.length);
  let newIds = [];
  if (files.length) {
    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM gift_images WHERE gift_id = ?', [id]
    );
    const [insertResult] = await pool.query(
      'INSERT INTO gift_images (gift_id, image_url, title, sort_order) VALUES ?',
      [files.map((f, i) => [id, `/uploads/gifts/${f.filename}`, newTitles[i], maxOrder + 1 + i])]
    );
    newIds = files.map((_, i) => insertResult.insertId + i);
  }

  let existingTitles = {};
  try { existingTitles = JSON.parse(req.body.existingTitles || '{}'); } catch { existingTitles = {}; }
  for (const [imgId, title] of Object.entries(existingTitles)) {
    const t = String(title || '').trim();
    await pool.query('UPDATE gift_images SET title = ? WHERE id = ? AND gift_id = ?', [t || null, Number(imgId), id]);
  }

  let order = [];
  try { order = JSON.parse(req.body.imageOrder || '[]'); } catch { order = []; }
  for (let pos = 0; pos < order.length; pos++) {
    const [kind, ref] = order[pos].split(':');
    const imgId = kind === 'new' ? newIds[Number(ref)] : Number(ref);
    if (imgId != null) {
      await pool.query('UPDATE gift_images SET sort_order = ? WHERE id = ? AND gift_id = ?', [pos, imgId, id]);
    }
  }

  const [imgRows] = await pool.query(
    'SELECT id, image_url, title FROM gift_images WHERE gift_id = ? ORDER BY sort_order, id', [id]
  );
  const image_url = (removeIds.length || files.length || order.length || removeCover)
    ? (imgRows[0]?.image_url ?? null)
    : giftRows[0].image_url;

  await pool.query(
    'UPDATE gifts SET name = ?, description = ?, image_url = ?, active = ? WHERE id = ?',
    [name, description, image_url, active, id]
  );

  const images = imgRows.length ? imgRows : (image_url ? [{ id: null, image_url, title: null }] : []);
  res.json({ id, name, description, image_url, images, active });
}));

// DELETE /api/gifts/:id — admin
router.delete('/:id', requireAdmin, ah(async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query('SELECT image_url FROM gifts WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Gift not found.' });

  const [galleryRows] = await pool.query('SELECT image_url FROM gift_images WHERE gift_id = ?', [id]);

  await pool.query('DELETE FROM gifts WHERE id = ?', [id]); // cascades gift_images
  const files = new Set([rows[0].image_url, ...galleryRows.map((r) => r.image_url)].filter(Boolean));
  files.forEach(removeImageFile);
  res.json({ ok: true });
}));

// Turns multer's upload-time errors (oversized file, too many files, wrong
// type) into a clear message instead of falling through to a generic 500.
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Each image must be smaller than ${MAX_FILE_MB}MB.` });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: `You can upload at most ${MAX_IMAGES} images.` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.message?.includes('Only JPEG, PNG, WEBP or GIF')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
