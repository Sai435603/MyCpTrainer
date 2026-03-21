import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying after 3 attempts
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

let isConnected = false;

redis.on('connect', () => { isConnected = true; });
redis.on('error', (err) => {
  isConnected = false;
  if (err.code !== 'ECONNREFUSED') {
    console.error('Redis error:', err.message);
  }
});
redis.on('close', () => { isConnected = false; });

// Try to connect but don't fail if Redis is unavailable
redis.connect().catch(() => {
  console.log('Redis unavailable — caching disabled, using direct API calls.');
});

/**
 * Get a cached value by key. Returns null on miss or if Redis is down.
 */
export async function cacheGet(key) {
  if (!isConnected) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL (seconds). Fails silently if Redis is down.
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
  if (!isConnected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silently fail — caching is best-effort
  }
}

export default redis;