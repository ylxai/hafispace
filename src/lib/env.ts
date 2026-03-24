/**
 * Environment variable validation at startup.
 * Throw error early if critical variables are not configured.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function optionalEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  const parsed = val ? parseInt(val, 10) : NaN;
  return isNaN(parsed) ? fallback : parsed;
}

export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Auth
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: optionalEnv("NEXTAUTH_URL", "http://localhost:3000"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: optionalEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: optionalEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: optionalEnv("CLOUDINARY_API_SECRET"),
  CLOUDINARY_MASTER_KEY: requireEnv("CLOUDINARY_MASTER_KEY"), // ✅ Critical for credentials encryption
  CLOUDINARY_URL: optionalEnv("CLOUDINARY_URL"),

  // Ably
  ABLY_API_KEY: optionalEnv("ABLY_API_KEY"),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: optionalEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),

  // CORS
  ALLOWED_ORIGINS: optionalEnv("ALLOWED_ORIGINS"),

  // Resend Email
  RESEND_API_KEY: optionalEnv("RESEND_API_KEY"),

  // App
  NEXT_PUBLIC_APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: optionalEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),

  // Rate Limits
  RATE_LIMIT_SELECT_PER_MINUTE: optionalEnvInt("RATE_LIMIT_SELECT_PER_MINUTE", 300),
  RATE_LIMIT_NOTIFY_PER_HOUR: optionalEnvInt("RATE_LIMIT_NOTIFY_PER_HOUR", 20),
  RATE_LIMIT_BOOKING_PER_HOUR: optionalEnvInt("RATE_LIMIT_BOOKING_PER_HOUR", 20),
  RATE_LIMIT_SUBMIT_PER_MINUTE: optionalEnvInt("RATE_LIMIT_SUBMIT_PER_MINUTE", 10),

  // Security
  BCRYPT_COST_FACTOR: optionalEnvInt("BCRYPT_COST_FACTOR", 12),

  // Performance
  GALLERY_MAX_PHOTOS: optionalEnvInt("GALLERY_MAX_PHOTOS", 1000),
  METRICS_CACHE_TTL_SECONDS: optionalEnvInt("METRICS_CACHE_TTL_SECONDS", 300),
} as const;
