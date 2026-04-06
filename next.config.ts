import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { dirname,resolve } from "path";
import { fileURLToPath } from "url";

import { getAllowedOrigins } from "./src/lib/cors";
import { env } from "./src/lib/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allowedOrigins = getAllowedOrigins();

// next.config headers() tidak mendukung dynamic origin per-request,
// jadi CORS per-request origin check ditangani di middleware.ts
// Di sini hanya set security headers statis
const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, "./"),
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // Configure image quality levels for optimization
    qualities: [75, 80, 90, 95],
  },
  // Limit request body size for JSON payloads (not file uploads)
  // File uploads use multipart/form-data and are handled separately
  // Configurable via BODY_SIZE_LIMIT_MB env var (default: 5MB)
  serverActions: {
    bodySizeLimit: `${env.BODY_SIZE_LIMIT_MB}mb`,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options", value: "DENY" },
          // MIME type sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy — disable unused browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS — force HTTPS for 1 year (includeSubDomains)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Content Security Policy — prevent XSS
          // unsafe-inline diizinkan untuk Next.js inline scripts & styles
          // Cloudinary sebagai media source, Sentry sebagai connect-src
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-eval dihapus — tidak diperlukan di Next.js production
              // Next.js 15 menggunakan nonce-based CSP untuk inline scripts
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com",
              "media-src 'self' https://res.cloudinary.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.sentry.io https://*.ably.io wss://*.ably.io https://api.cloudinary.com https://*.ingest.sentry.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export { allowedOrigins };

export default withSentryConfig(nextConfig, {
  org: "pridayfn",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
