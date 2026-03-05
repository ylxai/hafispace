/**
 * Simple in-memory rate limiter
 * Tidak butuh Redis — cukup untuk single-instance server
 * Key: string (misal IP + route), Value: { count, resetAt }
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries setiap 5 menit
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

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

/**
 * Cek rate limit untuk key tertentu.
 * @param key - Identifier unik (misal: `${ip}:${route}`)
 * @param options - limit dan windowMs
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Window baru
    const resetAt = now + options.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: options.limit - 1, resetAt };
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: options.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Ambil IP dari request headers
 * Catatan: x-forwarded-for bisa di-spoof oleh klien jika tidak ada trusted proxy.
 * Pastikan reverse proxy (Nginx/Vercel/Cloudflare) meng-override header ini.
 */
export function getClientIp(request: Request): string {
  // Prioritas x-real-ip (di-set trusted proxy, tidak bisa di-spoof klien)
  // Fallback ke .pop() dari x-forwarded-for (ambil IP proxy terakhir, bukan klien)
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}
