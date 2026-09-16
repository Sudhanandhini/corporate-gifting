import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({ url: REDIS_URL });

let ready = false;
let warnedDown = false;

redis.on('ready', () => {
  ready = true;
  warnedDown = false;
  console.log('Redis connected — response caching enabled.');
});
redis.on('end', () => { ready = false; });
// node-redis retries forever in the background with backoff; only log the
// first failure so a Redis-less dev setup doesn't spam the console.
redis.on('error', (err) => {
  ready = false;
  if (!warnedDown) {
    console.warn(`Redis unavailable (${err.code || err.message || err}) — running without cache until it reconnects.`);
    warnedDown = true;
  }
});

export const isRedisReady = () => ready;

// Best-effort: caching is purely additive, so a missing/unreachable Redis
// must never stop the API from starting or serving requests.
export async function connectRedis() {
  try {
    await redis.connect();
  } catch {
    // already logged via the 'error' handler above
  }
}
