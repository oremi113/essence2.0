import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/auth", "/api/public", "/_next", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/auth/") || pathname === "/auth") return true;
  if (pathname.startsWith("/api/public/") || pathname === "/api/public") return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/app") || pathname === "/home" || pathname === "/settings";
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return response;
  }

  if (!user) {
    const next = encodeURIComponent(pathname + search);
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("next", next);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
