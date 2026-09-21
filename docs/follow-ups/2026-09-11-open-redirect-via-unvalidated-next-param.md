---
id: 2026-09-11-open-redirect-via-unvalidated-next-param
priority: P2
status: resolved
opened: 2026-09-11
resolved: 2026-09-21
owner_paired: true
summary: RESOLVED 2026-09-21 — The post-login `next` param is followed without a same-origin check → a crafted `/auth/sign-in?next=//evil.com` link sends a just-authenticated user off-site (open redirect / phishing aid) *(triage 2026-09-11)*
---

# Open redirect: the post-login `next` target is followed without a same-origin check

*(triage 2026-09-11 — found reading the OTP sign-in flow)*

The sign-in flow carries a `next` query param that says where to send the user after
they authenticate. Three places read it straight from the URL and navigate to it with
no validation that it points back into our own site:

- `src/app/auth/sign-in/page.tsx:83` reads `next` from `searchParams`, then hands it
  unchanged to `router.replace(next)` at **line 102** (the already-signed-in shortcut)
  and **line 146** (right after the 8-digit code verifies — the live path).
- `src/app/auth/callback/route.ts:57` is the only site that checks anything, but the
  check is `next.startsWith("/")` — which **accepts a protocol-relative URL** like
  `//evil.com`. `new URL("//evil.com", request.url)` resolves to `https://evil.com/`,
  and the route then issues a `NextResponse.redirect` to it (line 58).

`src/lib/routes.ts:70` (`signInWithNext`) just string-interpolates the value, so nothing
upstream sanitises it either. The values our own code passes in are safe constants
(`ROUTES.*`), but the param is in the URL, so an attacker supplies their own.

**Why it matters:** an attacker sends a victim a link to our *real* domain —
`https://essencevault.app/auth/sign-in?next=//evil.com`. The victim signs in normally
(enters their own code — the attacker needs no token of theirs), and on success is
bounced to `evil.com`, which can be dressed up as ESSENCE to harvest whatever the fake
page asks for. This is the textbook post-login open-redirect used to lend a phishing
page the legitimacy of our domain. It costs no data or money on our side directly, but
it is a genuine security hole on the primary sign-in flow, live today, triggered by a
link anyone can craft.

**Fix shape:** validate `next` before following it, in one shared helper (e.g. a
`safeNextPath(next)` in `src/lib/routes.ts`) used by all three sites: accept only a
value that starts with a single `/` **and not** `//` or `/\` (reject protocol-relative
and backslash tricks), and reject anything containing `://` or a scheme; fall back to
`/home` otherwise. Reuse the helper in the callback route in place of the bare
`startsWith("/")`. A unit test with the hostile inputs (`//evil.com`, `/\evil.com`,
`https://evil.com`, `javascript:…`) locks it.

**Pick up when:** before beta widens / launch — it is on the auth surface, so
**owner-paired** (auth/middleware is on the never-touch list): flag, don't let the
scheduled fixer land it unreviewed, even though the fix itself is small and local.
Pairs with the existing auth-hardening posture.


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
