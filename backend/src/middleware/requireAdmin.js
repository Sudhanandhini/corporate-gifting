import { verifyToken } from '../authToken.js';

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token && verifyToken(token);
  if (!session) return res.status(401).json({ error: 'Admin login required.' });
  req.admin = session;
  next();
}
