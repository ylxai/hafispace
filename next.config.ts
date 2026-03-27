import type { NextConfig } from "next";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getAllowedOrigins } from "./src/lib/cors";
import { withSentryConfig } from "@sentry/nextjs";
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
    // ✅ Configure quality levels for Next.js 16 compatibility
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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
