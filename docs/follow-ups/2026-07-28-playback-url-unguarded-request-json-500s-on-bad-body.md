---
id: 2026-07-28-playback-url-unguarded-request-json-500s-on-bad-body
priority: P4
status: open
opened: 2026-07-28
resolved:
owner_paired: false
summary: `audio/playback-url` hand-rolls `await request.json()` with no `.catch` and no `bodySchema`, so a malformed/empty body throws and surfaces as a 500 (retryable server error) instead of the 400 its sibling body-carrying routes return *(triage 2026-07-28)*
---

# `audio/playback-url` returns 500 (not 400) on a malformed request body

*(triage 2026-07-28)*

`src/app/api/audio/playback-url/route.ts:26` does `const body = await request.json();` with no
`.catch`. The route is configured `{ auth: true, checkBodySize: true }` but sets **no** `bodySchema`,
so `defineRoute` never parses/validates the body for it. A malformed or empty JSON body throws inside
the handler, is caught by `defineRoute`'s generic `handleRouteError`, and returns a **500** (server
error, marked retryable). Its sibling body-carrying routes (`messages/discard`, `messages/waitlist`)
go through `bodySchema`, whose `request.json().catch(() => null)` yields a clean **400** for the same
input.

**Why it matters:** low impact — a well-behaved client never sends a malformed body — but a bad request
is misreported as a server fault, which pollutes error dashboards and tells clients to retry a request
that will never succeed. It's also an inconsistency with the route factory's own convention on every
other body-carrying route.

**Fix shape:** give the route a `bodySchema` (`{ kind, id }`) so `defineRoute` validates and 400s
uniformly, or minimally `await request.json().catch(() => ({}))` and let the existing `kind`/`id`
checks return their 400s.

**Pick up when:** next time this route or the Zod-validation sweep is touched. Trivial, non-visual.
