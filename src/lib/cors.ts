/**
 * CORS utility — single source of truth untuk allowed origins
 * Dipakai di middleware.ts dan next.config.ts
 *
 * Konfigurasi via env var ALLOWED_ORIGINS (comma-separated):
 * ALLOWED_ORIGINS=https://hafiportrait.com,https://www.hafiportrait.com
 *
 * Fallback ke NEXT_PUBLIC_APP_URL, lalu localhost untuk development
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
