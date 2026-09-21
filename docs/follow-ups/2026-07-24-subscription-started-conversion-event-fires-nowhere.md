---
id: 2026-07-24-subscription-started-conversion-event-fires-nowhere
priority: P3
status: open
opened: 2026-07-24
resolved:
owner_paired: false
summary: The headline conversion event `subscription_started` fires nowhere — the spine's monetization move retired its only emit site (`/app/vault/sealed`) without rewiring it into the post-payment landing, so the funnel's paid-conversion metric will always read zero *(triage 2026-07-24)*
---

# The `subscription_started` conversion event fires nowhere after the spine deleted its emit site → the headline funnel metric reads zero

*(triage 2026-07-24 — discovery. Refines FU-101, whose "3 sites" list still points at
`src/app/app/vault/sealed/actions.tsx` — the once-guard that no longer exists.)*

`src/lib/analytics/journey.ts:44` defines `subscriptionStarted: 'subscription_started'` (allowlisted,
documented as the paid-conversion beat: `onboarding_completed → subscription_started →
voice_profile_ready`). A repo-wide grep for `subscription_started` / `subscriptionStarted` returns
**only** `journey.ts` — there is no `trackJourney(JOURNEY_EVENTS.subscriptionStarted, …)` call anywhere
in `src/` (verified on `main` **and** on the active `feat/s5-stripe-golive` branch's processing page).
Its former home, `/app/vault/sealed`, is now just `redirect(ROUTES.home)`
(`src/app/app/vault/sealed/page.tsx`) — the spine's S4 cleanup retired the subscribe arc and moved the
post-payment beat to `/app/voice/processing`, but the event was never rewired there or into Card Capture
(`/app/vault/protect`). `docs/analytics/2026-07-12-spine-monetization-move.md` says the beacon "now
corresponds to Card Capture," but Card Capture emits no `trackJourney` call, and the older
`docs/analytics/2026-06-16-journey-funnel-events.md` still documents the event as firing on
`/app/vault/sealed`.

**Why it matters:** "did the user pay?" is the single headline metric of the V1 validation funnel. The
event that records it is defined, allowlisted, and documented — but fires nowhere, so that number reads
zero forever. Launching with the conversion metric dark means you can't measure the one thing the funnel
exists to validate. (Scored P3 to match this repo's precedent for analytics-instrumentation gaps
(#16, #64) — but it's the highest-value P3 here, not a nice-to-have.)

**Fix shape:** emit `trackJourney(JOURNEY_EVENTS.subscriptionStarted, { subscription_status })` once per
mount at the real post-payment landing (`/app/voice/processing`, per the monetization-move doc), and
update the 2026-06-16 catalog's "Fires:" line. Drop a `docs/analytics/YYYY-MM-DD-*.md` note per house
rules. Confirm with whoever owns the spine wiring whether this was a pending step on
`feat/s5-stripe-golive` before opening the fix — it is absent there today, so it reads as a genuine gap.

**Pick up when:** before public launch (funnel must be measurable at go-live), or the next analytics
pass — whichever is first.
