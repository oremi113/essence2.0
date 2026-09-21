---
id: 2026-09-04-auth-next-param-open-redirect
priority: P3
status: resolved
opened: 2026-09-04
owner_paired: true
summary: RESOLVED 2026-09-21 — The post-sign-in `next` redirect target is not validated as same-origin — the client uses it raw and the server callback only checks `startsWith("/")`, which a protocol-relative `//evil.com` slips past, so a crafted sign-in link can bounce a just-authenticated user to an attacker's site
---

# Auth `next` redirect target is not validated (open-redirect)

**What happens:** the sign-in flow reads a `next` query parameter and sends the
user there after they authenticate. Nothing confirms `next` points back into
ESSENCE:

- `src/app/auth/sign-in/page.tsx:83` reads `next = searchParams.get("next") ?? "/home"`,
  then `router.replace(next)` on both the already-signed-in shortcut
  (`:102`) and after a successful code verify (`:146`) — with **no** check at all.
- `src/app/auth/callback/route.ts:57` (the legacy magic-link / `token_hash`
  path) guards with only `next.startsWith("/")` before
  `NextResponse.redirect(new URL(redirectTo, request.url))`. A **protocol-relative**
  value like `//evil.com` (or `/\evil.com`) starts with `/` yet resolves to a
  different origin, so the guard passes and the user is redirected off-site.

**Why it matters (plain language):** an attacker can send someone a link to the
*real* ESSENCE sign-in page with a hidden `?next=//lookalike-site.example`. The
person signs in normally on the genuine site, then gets silently bounced to the
attacker's page — which can impersonate ESSENCE and ask for more. It's a classic
"open redirect": it doesn't steal the session by itself, but it lends the real
domain's trust to a phishing hop, right at a launch when we're emailing sign-in
links to beta users.

**Fix shape:** validate `next` as a *same-origin, path-only* value before using
it, in one shared helper used by both the client and the callback. Accept only a
string that starts with a single `/` **and not** `//` or `/\`; otherwise fall
back to `/home`. (Equivalent: resolve `new URL(next, origin)` and reject if
`url.origin !== ourOrigin`.)

**Owner-paired:** this lives in the auth surface (`docs/REFACTORING_SYSTEM.md` §5
never-touch — auth/middleware). Flagged for an owner-paired fix, not an
autonomous refactor-branch change.

**Pick up when:** before the beta invite emails go out (sign-in links are the
delivery vehicle), or with the next auth/session pass — whichever comes first.


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
