import { redis, isRedisReady } from '../redis.js';

const keyFor = (prefix, req) => `cache:${prefix}:${req.originalUrl}`;

// Wraps a GET route: serves a cached JSON body when present, otherwise lets
// the route run and caches whatever it responds with (2xx only) for
// ttlSeconds. A no-op whenever Redis isn't connected, so caching is purely
// additive — the API behaves identically with or without a running Redis.
export function cacheMiddleware(prefix, ttlSeconds) {
  return async (req, res, next) => {
    if (!isRedisReady()) return next();
    const key = keyFor(prefix, req);

    try {
      const cached = await redis.get(key);
      if (cached != null) {
        res.set('X-Cache', 'HIT');
        return res.type('application/json').send(cached);
      }
    } catch {
      // fall through to the normal DB-backed handler on any Redis read error
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (isRedisReady() && res.statusCode < 400) {
        redis.set(key, JSON.stringify(body), { EX: ttlSeconds }).catch(() => {});
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  };
}

// Deletes every cached entry under the given prefixes. Call after any write
// that could change what those cached GETs would return — a stale cache
// entry would otherwise keep serving old data until its TTL expires.
export async function invalidateCache(...prefixes) {
  if (!isRedisReady()) return;
  try {
    for (const prefix of prefixes) {
      const keys = await redis.keys(`cache:${prefix}:*`);
      if (keys.length) await redis.del(keys);
    }
  } catch {
    // best-effort; the stale entry still expires on its own TTL
  }
}
