---
id: 2026-08-28-auth-callback-open-redirect-protocol-relative-next
priority: P2
status: resolved
opened: 2026-08-28
resolved: 2026-09-21
owner_paired: true
summary: RESOLVED 2026-09-21 — Auth magic-link callback validates `next` with only `startsWith("/")` → a protocol-relative `//evil.com` redirects a just-signed-in user off-site (open redirect) *(triage 2026-08-28)*
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
