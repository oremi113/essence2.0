---
id: 2026-08-28-auth-callback-open-redirect-protocol-relative-next
priority: P2
status: open
opened: 2026-08-28
resolved:
owner_paired: true
summary: Auth magic-link callback validates `next` with only `startsWith("/")` → a protocol-relative `//evil.com` redirects a just-signed-in user off-site (open redirect) *(triage 2026-08-28)*
---

# Auth callback open-redirect — `next` accepts protocol-relative URLs

*(triage 2026-08-28)*
`src/app/auth/callback/route.ts:49` — after a successful magic-link / OTP exchange the route decides where to send the user with:

```ts
const redirectTo = next.startsWith("/") ? next : "/home";
return NextResponse.redirect(new URL(redirectTo, request.url));
```

`startsWith("/")` is passed by a **protocol-relative** value like `next=//evil.com` (and `/\evil.com`), and `new URL("//evil.com", request.url)` resolves to `https://evil.com` — so the redirect leaves the site. The same unvalidated `next` has a second live sink: `src/app/auth/sign-in/page.tsx:10,21` reads `next` and does `router.replace(next)` for an already-authenticated visitor.

**Why it matters:** an attacker can craft a sign-in link (`/auth/sign-in?next=//evil.com` or a callback URL) that lands the user on an attacker page *immediately after they authenticate* — the classic open-redirect phishing / token-forward setup, on the one flow where the user has just proven trust. It's a security hole, not a UX nit, which is why it sits in the P2 band even though no user has hit it yet.

**Fix shape:** reject `//` and `/\` before redirecting — the repo already has the correct guard in `src/app/api/stripe/portal-session/route.ts:20` (`raw.startsWith('/') && !raw.startsWith('//')`). Extract that into a shared `safeRedirectPath` helper and use it at both the callback and the sign-in sink. **Owner-paired** — this is auth/middleware, on the never-touch list; flagged for an owner-paired fix, not an unattended refactor branch.

**Pick up when:** before public launch (any auth surface exposed to crafted links), or the next auth/session hardening pass. Small, self-contained, but auth-sensitive.
