import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/gifts
router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, description FROM gifts WHERE active = 1 ORDER BY id'
  );
  res.json(rows);
});

export default router;
