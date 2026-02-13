import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Single Supabase client for browser. Session is cookie-based and server-trusted.
 * detectSessionInUrl is false so the client never parses session from URL;
 * magic link exchange happens only server-side in /auth/callback.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  browserClient = createBrowserClient(url, anonKey, {
    auth: { detectSessionInUrl: false },
    isSingleton: true,
  });
  return browserClient;
}
