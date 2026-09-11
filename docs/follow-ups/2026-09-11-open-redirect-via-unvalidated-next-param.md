---
id: 2026-09-11-open-redirect-via-unvalidated-next-param
priority: P2
status: open
opened: 2026-09-11
resolved:
owner_paired: true
summary: The post-login `next` param is followed without a same-origin check → a crafted `/auth/sign-in?next=//evil.com` link sends a just-authenticated user off-site (open redirect / phishing aid) *(triage 2026-09-11)*
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
