import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Jika sudah login dan akses /login, redirect ke /admin
    if (req.nextUrl.pathname === "/login" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Halaman /admin/* wajib login
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token;
        }
        // Halaman lain boleh diakses tanpa login
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Match /admin dan /admin/* (dengan dan tanpa trailing path)
  matcher: ["/admin", "/admin/:path*", "/login"],
};
