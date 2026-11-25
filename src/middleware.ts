import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  // 1. Protect /my-tickets: authenticated users only
  if (pathname.startsWith("/my-tickets")) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    }
  }

  // 2. Protect /dashboard: ORGANIZER and ADMIN only
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    }
    if (userRole !== "ORGANIZER" && userRole !== "ADMIN") {
      // Redirect unauthorized users to /events
      return NextResponse.redirect(new URL("/events", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/my-tickets/:path*",
    "/dashboard/:path*",
  ],
};
