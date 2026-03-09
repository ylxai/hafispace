/**
 * Upstash Redis client singleton.
 * Digunakan untuk view count deduplication (fingerprint cache)
 * dan potensi fitur lain yang butuh fast key-value store.
 *
 * Fallback ke null jika env vars tidak dikonfigurasi,
 * sehingga app tetap berjalan tanpa Redis (degrades gracefully).
 */

import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Redis] UPSTASH_REDIS_REST_URL atau UPSTASH_REDIS_REST_TOKEN tidak dikonfigurasi. View deduplication akan fallback ke in-memory cache.");
    }
    return null;
  }

  return new Redis({ url, token });
}

// Singleton — reuse koneksi antar requests di Node.js runtime
const globalForRedis = globalThis as typeof globalThis & {
  _redisClient?: Redis | null;
};

export const redis: Redis | null =
  globalForRedis._redisClient ?? (globalForRedis._redisClient = createRedisClient());
