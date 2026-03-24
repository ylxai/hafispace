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

// Origins yang selalu diizinkan (docs, internal tools, dll)
const ALWAYS_ALLOWED_ORIGINS = [
  "https://pridayfn.mintlify.dev", // Mintlify documentation site
];

export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const configured = envOrigins
    ? envOrigins.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const fallback = process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : ["http://localhost:3000"];

  const base = configured.length > 0 ? configured : fallback;

  // Merge: always-allowed + configured, deduplicated
  return [...new Set([...ALWAYS_ALLOWED_ORIGINS, ...base])];
}
