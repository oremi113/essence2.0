---
id: 2026-07-17-portal-session-returnpath-backslash-open-redirect
priority: P3
status: resolved
opened: 2026-07-17
resolved: 2026-09-21
owner_paired: false
summary: RESOLVED 2026-09-21 — portal-session's same-origin guard rejects "//host" but not "/\host", so a crafted returnPath yields an off-site Stripe return_url — an open redirect *(triage 2026-07-17)*
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


---

## Resolved — 2026-09-21

One shared `safeNextPath()` (`src/lib/auth/safeNextPath.ts`) now guards **all
four** redirect sites that took an attacker-controlled destination:

| Site | Check before |
|---|---|
| `auth/callback/route.ts` | `startsWith("/")` — allowed `//evil.com` |
| `auth/sign-in/page.tsx` (×2) | **none** — `router.replace(next)` raw |
| `api/stripe/portal-session/route.ts` | `startsWith("/") && !startsWith("//")` — allowed `/\evil.com` |

The rule: exactly one leading slash, with neither a slash nor a backslash
behind it, and no percent-encoded equivalent (`%2f`, `%5c`). Otherwise fall
back — `/home` for auth, `/app/vault/restore` for the portal.

Consolidated rather than patched per-site on purpose: the four consumers had
drifted to four different levels of rigour, which is exactly how two of them
ended up with no check at all. Pinned by `tests/unit/safe-next-path.test.ts`
(8 cases, including the backslash and percent-encoded forms); they fail against
each of the old guards.

**Note on duplication:** triage filed this same `next` bug three times
(2026-08-28, 2026-09-04, 2026-09-11) because none of those triage PRs ever
landed — the same pattern that produced four PRs for FU-93. All three are
resolved by this one change.
