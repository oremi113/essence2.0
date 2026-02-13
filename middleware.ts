import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/app") ||
    pathname === "/home" ||
    pathname === "/settings"
  );
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Only enforce auth on protected routes
  if (!isProtectedPath(pathname)) {
    return response;
  }

  // Redirect unauthenticated users
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
    // Exclude static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
