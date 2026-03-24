/**
 * Server-only constants — jangan diimport di client components.
 * Semua nilai yang bergantung pada environment variables server.
 */
import { env } from "@/lib/env";

// ─── Rate Limits ─────────────────────────────────────────────────────────────

export const RATE_LIMIT_SELECT_PER_MINUTE = env.RATE_LIMIT_SELECT_PER_MINUTE;
export const RATE_LIMIT_NOTIFY_PER_HOUR = env.RATE_LIMIT_NOTIFY_PER_HOUR;
export const RATE_LIMIT_BOOKING_PER_HOUR = env.RATE_LIMIT_BOOKING_PER_HOUR;
export const RATE_LIMIT_SUBMIT_PER_MINUTE = env.RATE_LIMIT_SUBMIT_PER_MINUTE;

// ─── Security ────────────────────────────────────────────────────────────────

export const BCRYPT_COST_FACTOR = env.BCRYPT_COST_FACTOR;

// ─── Performance ─────────────────────────────────────────────────────────────

export const GALLERY_MAX_PHOTOS = env.GALLERY_MAX_PHOTOS;
export const METRICS_CACHE_TTL_SECONDS = env.METRICS_CACHE_TTL_SECONDS;

// ─── Fingerprint / Deduplication ─────────────────────────────────────────────

export const FINGERPRINT_TTL_SECONDS = 24 * 60 * 60;
