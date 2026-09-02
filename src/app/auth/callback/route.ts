import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Auth callback. Primary sign-in is now the 6-digit code flow (verifyOtp in the
 * browser on /auth/sign-in), which does NOT route through here. This route is
 * kept for edge cases: an older magic link (PKCE `code`), or a `token_hash`
 * confirmation link. It must never throw — any failure lands the user back on
 * the sign-in screen with a readable reason, not the app error boundary.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/home";

  const fail = (reason: string) => {
    const url = new URL("/auth/sign-in", request.url);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return fail("config");

    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    });

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return fail("link_expired");
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "magiclink" | "signup" | "recovery" | "invite" | "email_change" | "email",
      });
      if (error) return fail("link_expired");
    } else {
      return fail("missing_token");
    }

    const redirectTo = next.startsWith("/") ? next : "/home";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch {
    // Never surface the app error boundary on an auth hiccup.
    return fail("unexpected");
  }
}
