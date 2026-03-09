import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Daftar allowed origins — multi-origin dari ALLOWED_ORIGINS (comma-separated)
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

function setCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Vary", "Origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") ?? "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Handle OPTIONS preflight untuk semua API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const preflightResponse = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) setCorsHeaders(preflightResponse, origin);
    return preflightResponse;
  }

  // Auth check untuk admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = await getToken({ req: request });

    if (!token) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect root ke admin
  if (pathname === "/") {
    const token = await getToken({ req: request });
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  // Set CORS headers untuk semua API responses jika origin diizinkan
  if (pathname.startsWith("/api/") && isAllowedOrigin) {
    setCorsHeaders(response, origin);
  }

  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/:path*"],
};
