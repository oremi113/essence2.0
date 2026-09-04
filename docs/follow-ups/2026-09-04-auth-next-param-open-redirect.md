---
id: 2026-09-04-auth-next-param-open-redirect
priority: P3
status: open
opened: 2026-09-04
owner_paired: true
summary: The post-sign-in `next` redirect target is not validated as same-origin — the client uses it raw and the server callback only checks `startsWith("/")`, which a protocol-relative `//evil.com` slips past, so a crafted sign-in link can bounce a just-authenticated user to an attacker's site
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
