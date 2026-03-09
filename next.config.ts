import type { NextConfig } from "next";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getAllowedOrigins } from "./src/lib/cors";

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

export default nextConfig;
