import type { NextConfig } from "next";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Daftar allowed origins dari environment variable (comma-separated)
// Contoh: ALLOWED_ORIGINS=https://hafiportrait.com,https://www.hafiportrait.com
// Fallback ke NEXT_PUBLIC_APP_URL, lalu localhost untuk development
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return [appUrl];
  return ["http://localhost:3000"];
}

const allowedOrigins = getAllowedOrigins();

// next.config headers() tidak mendukung dynamic origin per-request,
// jadi CORS per-request origin check ditangani di middleware.ts
// Di sini hanya set security headers statis
const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, "./"),
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
