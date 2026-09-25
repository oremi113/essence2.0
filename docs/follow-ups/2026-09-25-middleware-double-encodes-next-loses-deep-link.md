---
id: 2026-09-25-middleware-double-encodes-next-loses-deep-link
priority: P2
status: open
opened: 2026-09-25
resolved:
owner_paired: true
summary: The auth middleware `encodeURIComponent`s the `next` path and then hands it to `searchParams.set`, which encodes it a second time — so after sign-in `safeNextPath` rejects the mangled value and every signed-out deep link silently lands on `/home` instead of its destination *(triage 2026-09-25)*
---

# Auth middleware double-encodes `next`, so post-sign-in deep links are silently lost

*(triage 2026-09-25 — deep read of the auth redirect round-trip; owner-paired because the fix is in `middleware.ts`, a never-touch file)*

`middleware.ts:24-26` builds the post-auth return path like this:

```ts
const next = encodeURIComponent(pathname + search);   // "/app/record" -> "%2Fapp%2Frecord"
const signInUrl = new URL(ROUTES.signIn, request.url);
signInUrl.searchParams.set("next", next);              // set() encodes AGAIN -> "%252Fapp%252Frecord"
```

`URLSearchParams.set` already percent-encodes the value when the URL is
serialized, so the pre-`encodeURIComponent` makes it **double-encoded**. The
round-trip then breaks on read:

1. Query string on the wire: `next=%252Fapp%252Frecord`.
2. Sign-in page reads `searchParams.get("next")` (`src/app/auth/sign-in/page.tsx:84`),
   which decodes **once** → `"%2Fapp%2Frecord"` (still encoded, not the raw path).
3. `safeNextPath("%2Fapp%2Frecord")` (`src/lib/auth/safeNextPath.ts:34`) requires
   the value to start with `/`; this one starts with `%`, so it returns the
   `DEFAULT_NEXT` fallback `/home`.

Net effect: **the `next` feature is entirely dead.** A signed-out user who opens
any protected deep link — the common case for an emailed beta invite pointing at
a specific screen — authenticates successfully but is dropped on `/home` rather
than where the link pointed. The destination is discarded with no error anywhere.

This is distinct from the resolved open-redirect items
(`2026-09-11-open-redirect-via-unvalidated-next-param`,
`2026-09-04-auth-next-param-open-redirect`,
`2026-08-28-auth-callback-open-redirect-protocol-relative-next`), which hardened
`safeNextPath` to *reject* malicious `//evil.com` values. This entry is the
opposite failure: legitimate same-origin destinations are being thrown away. The
bug has been latent since the original auth build (`5e31aca`); it surfaced now
because beta invites lean on deep links. Commit `e4447b2` (#112) mentions it in
passing as "#115" but no follow-up was ever filed and there is no GitHub issue.

**Why it matters:** someone you invite to a specific place in the app clicks the
link, signs in, and lands on the generic home screen instead — the app quietly
forgets where they were headed, on the very first thirty seconds of every beta
invitation.

**Fix shape:** drop the `encodeURIComponent` — pass the raw `pathname + search`
to `searchParams.set`, which handles encoding. (`safeNextPath` already guards the
value on the way out, so no encoded-slash bypass is reintroduced.) Because the fix
edits `middleware.ts`, it is **owner-paired** per the never-touch list — flag for
an owner conversation, not an agent refactor branch. A one-line change, but
auth/middleware is off-limits to the fixer without explicit sign-off.

**Pick up when:** before the beta invite push relies on deep links, or the next
time auth/middleware is opened with owner sign-off. Verify by signing out,
visiting `/app/record`, signing in, and confirming you land back on `/app/record`.
