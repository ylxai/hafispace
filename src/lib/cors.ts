/**
 * CORS utility — single source of truth for allowed origins.
 * Used in middleware.ts and next.config.ts.
 *
 * Configure via ALLOWED_ORIGINS env var (comma-separated):
 * ALLOWED_ORIGINS=https://hafiportrait.com,https://www.hafiportrait.com
 *
 * Falls back to NEXT_PUBLIC_APP_URL, then localhost for development.
 *
 * NOTE: This file is imported by next.config.ts at build time,
 * so it cannot use the @/lib/env path alias. Direct process.env access is intentional here.
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return [appUrl];
  return ["http://localhost:3000"];
}
