"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

/**
 * Passwordless sign-in via a 6-digit email code (not a magic link).
 *
 * Why code, not link: a link forces a redirect back through /auth/callback and a
 * server-side PKCE exchange that needs the code-verifier cookie from the
 * requesting browser. That breaks whenever the link is opened on a different
 * device/browser than it was requested on (phone mail apps, etc.) and is
 * vulnerable to email-scanner prefetch consuming the single-use token. A code
 * the user types has none of those failure modes: request anywhere, type it
 * anywhere. verifyOtp establishes the cookie session directly — no callback.
 *
 * Requires the Supabase "Magic Link" email template to include the code token
 * ({{ .Token }}); see docs/legal/... / the runbook.
 */

const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  fontFamily: "var(--font-body)",
  color: "var(--color-text-primary)",
  background: "var(--color-bg-neutral)",
};
const card: React.CSSProperties = { width: "100%", maxWidth: 360, textAlign: "center" };
const wordmark: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  letterSpacing: "0.14em",
  fontSize: 16,
  marginBottom: 28,
  color: "var(--color-text-secondary)",
};
const title: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 26,
  fontWeight: 500,
  margin: "0 0 8px",
};
const sub: React.CSSProperties = { fontSize: 15, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.5 };
const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 16,
  borderRadius: 10,
  border: "1.5px solid var(--color-border)",
  background: "#fff",
  marginBottom: 12,
  fontFamily: "var(--font-body)",
};
const button: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 16px",
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 10,
  border: "none",
  background: "var(--color-mineral, #1C1A18)",
  color: "#fff",
  cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-text-secondary)",
  fontSize: 14,
  textDecoration: "underline",
  cursor: "pointer",
  marginTop: 16,
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const e = searchParams.get("error");
    if (!e) return null;
    if (e === "link_expired") return "That link expired. Enter your email for a fresh code.";
    if (e === "config" || e === "unexpected") return "Sign-in hit a snag. Please try again.";
    return "Please sign in again.";
  });
  const [checking, setChecking] = useState(true);

  // Already signed in? Skip straight to the app.
  useEffect(() => {
    fetch("/api/me")
      .then((res) => {
        setChecking(false);
        if (res.ok) router.replace(next);
      })
      .catch(() => setChecking(false));
  }, [router, next]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (err) {
        setError("That code didn't work. Check it, or request a new one.");
        return;
      }
      router.replace(next);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main style={wrap}>
        <div style={card}>
          <div style={wordmark}>ESSENCE</div>
          <p style={sub}>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={wordmark}>ESSENCE</div>

        {step === "email" ? (
          <form onSubmit={sendCode}>
            <h1 style={title}>Sign in</h1>
            <p style={sub}>Enter your email and we&rsquo;ll send you a 6-digit code.</p>
            <input
              style={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
              aria-label="Email address"
            />
            {error && <p style={{ color: "#b00020", fontSize: 14, margin: "0 0 12px" }} role="alert">{error}</p>}
            <button style={button} type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <h1 style={title}>Check your email</h1>
            <p style={sub}>
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
            </p>
            <input
              style={{ ...input, textAlign: "center", letterSpacing: "0.3em", fontSize: 22 }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
              aria-label="6-digit code"
            />
            {error && <p style={{ color: "#b00020", fontSize: 14, margin: "0 0 12px" }} role="alert">{error}</p>}
            <button style={button} type="submit" disabled={loading || code.length < 6}>
              {loading ? "Verifying…" : "Verify and continue"}
            </button>
            <div>
              <button
                type="button"
                style={linkBtn}
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main style={wrap}>
          <div style={card}>
            <div style={wordmark}>ESSENCE</div>
            <p style={sub}>Loading…</p>
          </div>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
