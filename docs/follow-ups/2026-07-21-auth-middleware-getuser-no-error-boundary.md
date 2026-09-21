---
id: 2026-07-21-auth-middleware-getuser-no-error-boundary
priority: P4
status: open
opened: 2026-07-21
resolved:
owner_paired: false
summary: Auth middleware awaits `supabase.auth.getUser()` with no try/catch → a transient Supabase-auth blip throws and hard-500s every matched route instead of degrading *(triage 2026-07-21)*
---

# Auth middleware has no error boundary around `getUser()` → a transient auth blip 500s the app

*(triage 2026-07-21 — surfaced auditing auth/session)*

`src/lib/supabase/middleware.ts:30-33`:

```ts
const { data: { user } } = await supabase.auth.getUser();
return { response, user };
```

`updateSession` awaits `getUser()` with no try/catch, and the root `middleware()` (`middleware.ts:14`)
awaits `updateSession` without one either. If the Supabase Auth endpoint is briefly unreachable (network
blip, 5xx), the promise rejects, `middleware()` throws, and the request hard-500s. Because the matcher
(`middleware.ts:34-38`) runs on essentially every non-static route, a logged-in — including just-paid,
mid-spine — user gets a broken app on a transient dependency hiccup rather than a retry or a clean
sign-in bounce.

**Why it matters:** a momentary auth-service hiccup should degrade (treat as signed-out → redirect to
sign-in, or pass through) rather than take down the whole protected app with an opaque 500. Low probability
(Supabase auth is usually reliable) but the blast radius is the entire site, and the fix is cheap.

**Fix shape:** wrap the `getUser()` call in try/catch inside `updateSession`; on throw, return
`{ response, user: null }` (or a dedicated "auth-unavailable" pass-through) so the caller degrades
deliberately. Decide intentionally whether an auth-unavailable state should bounce to sign-in or pass
through read-only — either is better than a crash. Log the caught error so the blip is observable.

**Pick up when:** next auth/middleware or reliability-hardening pass. Not user-facing under normal
conditions.
