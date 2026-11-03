import { NextRequest, NextResponse } from "next/server";
import { sessionConfig } from "@/lib/config";
import { verifySessionToken } from "@/lib/session-token";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/ruangan",
  "/kalender",
  "/pengajuan",
  "/riwayat",
  "/admin",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(sessionConfig.cookieName)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === "/login" && session) {
    const target = session.role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (needsAuth && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/ruangan/:path*",
    "/kalender/:path*",
    "/pengajuan/:path*",
    "/riwayat/:path*",
    "/admin/:path*",
  ],
};
