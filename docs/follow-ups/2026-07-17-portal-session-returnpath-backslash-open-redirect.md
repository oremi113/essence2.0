---
id: 2026-07-17-portal-session-returnpath-backslash-open-redirect
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: portal-session's same-origin guard rejects "//host" but not "/\host", so a crafted returnPath yields an off-site Stripe return_url — an open redirect *(triage 2026-07-17)*
---

# The Stripe portal return-path guard can be bypassed with a backslash → open redirect

*(triage 2026-07-17)*

`src/app/api/stripe/portal-session/route.ts:19` — `safeReturnPath` accepts a client-supplied
`returnPath` when it `startsWith('/')` and `!startsWith('//')`, then builds
`return_url = ${baseUrl}${returnPath}` for the Stripe Customer Portal session.

The check blocks protocol-relative `//evil.com` but not the backslash variant `/\evil.com`:
`'/\evil.com'.startsWith('/')` is `true` and `.startsWith('//')` is `false`, so it passes. The
resulting `return_url` is `https://app.example/\evil.com`, which browsers normalize to `//evil.com`
and treat as an off-site navigation. `returnPath` comes straight from the POST body, so it is
attacker-controllable.

**Why it matters:** after a user finishes in the Stripe billing portal, they can be bounced to an
attacker-controlled site while still trusting they're inside the app's billing flow — the classic
open-redirect phishing setup, made more convincing because it launches from a genuine Stripe session
tied to the user's real account. Impact is modest (it needs the victim to submit the crafted path and
then complete the portal round-trip), which is why it's P3, but it's a real security hole on a
payments surface.

**Fix shape:** tighten the allow-list. Reject any second character that is a slash or backslash
(`/^[\\/]/.test(raw.slice(1))`), or resolve and verify origin explicitly:
`const u = new URL(raw, baseUrl); if (u.origin !== new URL(baseUrl).origin) fall back`. Also reject
encoded slashes (`%2f`, `%5c`). Keep the existing fallback to `/app/vault/restore`.

**Pick up when:** the next security/hardening pass, or before public launch. Agent-fixable (a few
lines in one route; no migration, not the Stripe webhook). Worth a quick check that no other
`returnPath`/`next=` builder shares the same weak guard.
