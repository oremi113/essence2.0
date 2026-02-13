"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setChecking(false);
      if (user) router.replace(next);
    });
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = next ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : `${origin}/auth/callback`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Sign in</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (sent) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Sign in</h1>
        <p>Check your email for the sign-in link.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ display: "block", marginTop: 4, marginBottom: 12 }}
          />
        </label>
        {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}><h1>Sign in</h1><p>Loading…</p></main>}>
      <SignInForm />
    </Suspense>
  );
}
