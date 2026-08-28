import crypto from 'node:crypto';

const SECRET = process.env.ADMIN_SESSION_SECRET || 'dev-only-secret-change-me';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function issueToken(username) {
  const payload = `${username}.${Date.now() + TTL_MS}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString('base64url');
}

export function verifyToken(token) {
  try {
    const decoded = Buffer.from(String(token), 'base64url').toString('utf8');
    const [username, expiresAt, sig] = decoded.split('.');
    if (!username || !expiresAt || !sig) return null;
    const payload = `${username}.${expiresAt}`;
    if (sig !== sign(payload)) return null;
    if (Date.now() > Number(expiresAt)) return null;
    return { username };
  } catch {
    return null;
  }
}
