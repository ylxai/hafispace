/**
 * Environment variable validation saat startup.
 * Throw error lebih awal jika variable kritis tidak dikonfigurasi.
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

  // Ably
  ABLY_API_KEY: optionalEnv("ABLY_API_KEY"),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: optionalEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),

  // App
  NEXT_PUBLIC_APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: optionalEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"),
} as const;
