/**
 * Rate limiter menggunakan Upstash Redis (sliding window via INCR + EXPIRE).
 * Reliable di serverless/multi-instance karena state disimpan di Redis.
 * Fallback ke in-memory Map jika Redis tidak tersedia.
 *
 * Pattern: INCR key → jika == 1, set EXPIRE → cek vs limit
 */

import { redis } from "@/lib/redis";

type RateLimitOptions = {
  /** Jumlah maksimum request dalam window */
  limit: number;
  /** Durasi window dalam milidetik */
  windowMs: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

// Fallback in-memory store jika Redis tidak tersedia
type RateLimitEntry = { count: number; resetAt: number };
const fallbackStore = new Map<string, RateLimitEntry>();

if (
  typeof setInterval !== "undefined" &&
  typeof (globalThis as Record<string, unknown>).EdgeRuntime === "undefined"
) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of fallbackStore.entries()) {
      if (entry.resetAt < now) fallbackStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Cek rate limit untuk key tertentu menggunakan Upstash Redis.
 * Fallback ke in-memory Map jika Redis tidak tersedia.
 * @param key - Identifier unik (misal: `${ip}:${route}`)
 * @param options - limit dan windowMs
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const windowSec = Math.ceil(options.windowMs / 1000);
  const resetAt = Date.now() + options.windowMs;

  if (redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      // INCR atomic — jika key belum ada, Redis buat dengan value 0 lalu increment ke 1
      const count = await redis.incr(redisKey);
      // Set TTL hanya saat pertama kali (count === 1) — hindari reset window
      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }
      // Ambil TTL aktual untuk resetAt yang akurat
      const ttl = await redis.ttl(redisKey);
      const actualResetAt = ttl > 0 ? Date.now() + ttl * 1000 : resetAt;

      if (count > options.limit) {
        return { success: false, remaining: 0, resetAt: actualResetAt };
      }
      return { success: true, remaining: options.limit - count, resetAt: actualResetAt };
    } catch (err) {
      console.error("[RateLimit] Redis error, falling back to in-memory:", err);
      // Fallthrough ke in-memory jika Redis error
    }
  }

  // Fallback: in-memory Map
  const now = Date.now();
  const entry = fallbackStore.get(key);
  if (!entry || entry.resetAt < now) {
    fallbackStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: options.limit - 1, resetAt };
  }
  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { success: true, remaining: options.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Ambil IP dari request headers.
 * x-real-ip diset oleh trusted reverse proxy (Nginx/Vercel/Cloudflare).
 * JANGAN gunakan [0] dari x-forwarded-for — bisa di-spoof oleh klien.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}
