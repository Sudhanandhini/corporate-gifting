import { Router } from 'express';
import { pool } from '../db.js';
import { sendOtpEmail, isDevMail } from '../mailer.js';
import { issueToken } from '../authToken.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TTL_MIN = Number(process.env.OTP_TTL_MINUTES) || 10;

// POST /api/auth/admin-login  { username, password }
router.post('/admin-login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'Gift@2026';

  if (username !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  res.json({ token: issueToken(username), username });
});

// GET /api/auth/admin-session — used by the frontend to check a stored token is still valid
router.get('/admin-session', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

// POST /api/auth/request-otp  { email }
router.post('/request-otp', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const [employee] = await pool.query('SELECT id FROM employees WHERE email = ?', [email]);
  if (employee.length === 0) {
    return res.status(404).json({ error: 'This email is not registered.' });
  }

  const code = String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
  const expires = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await pool.query(
    'INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)',
    [email, code, expires]
  );

  const result = await sendOtpEmail(email, code);

  // In dev mode we surface the code so the client can be tested without SMTP.
  res.json({
    ok: true,
    message: 'OTP sent.',
    devMode: isDevMail,
    ...(isDevMail ? { devCode: code } : {}),
  });
});

// POST /api/auth/verify-otp  { email, code }
router.post('/verify-otp', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();

  if (!EMAIL_RE.test(email) || !/^\d{5}$/.test(code)) {
    return res.status(400).json({ error: 'Email and a 5-digit code are required.' });
  }

  const [rows] = await pool.query(
    `SELECT id FROM otp_codes
       WHERE email = ? AND code = ? AND consumed = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
    [email, code]
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }

  await pool.query('UPDATE otp_codes SET consumed = 1 WHERE id = ?', [rows[0].id]);

  const [existing] = await pool.query(
    `SELECT order_code, gift_name, recipient_name, phone, city, state, status
       FROM orders WHERE client_email = ? ORDER BY id DESC LIMIT 1`,
    [email]
  );

  res.json({ verified: true, email, existingOrder: existing[0] || null });
});

export default router;
