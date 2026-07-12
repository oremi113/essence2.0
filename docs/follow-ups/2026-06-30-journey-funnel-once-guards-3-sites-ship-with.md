---
id: 2026-06-30-journey-funnel-once-guards-3-sites-ship-with
legacy_id: 101
priority: P3
status: open
opened: 2026-06-30
resolved:
summary: Journey funnel once-guards (JourneyBeacon / VoiceCreationView / sealed actions) ship with zero test coverage *(triage 2026-06-30)*
---

# Journey funnel once-guards (3 sites) ship with zero test coverage

*(triage 2026-06-30)*
`src/components/analytics/JourneyBeacon.tsx:22-31`, `src/components/voice/VoiceCreationView.tsx:37-43`
(the `readyFired` ref), `src/app/app/vault/sealed/actions.tsx` (the `subscription_started` once-guard).
PR #59's funnel relies on a ref-based "fire exactly once" guard at three sites. The only test,
`tests/unit/journey-analytics.test.ts`, covers `trackJourney`'s envelope/namespacing — **not one test
exercises the once-guards themselves**, which are precisely the StrictMode-double-mount /
effect-dependency-refire surface that breaks funnel counts.
**Why it matters:** the funnel is how the business answers "do people pay and retain?" A future edit that
drops a ref guard or adds a reactive dependency would silently double- or zero-count and pass CI green —
a measurement regression invisible until the numbers are noticed wrong, by which point data is polluted.
**Fix shape:** add RTL tests asserting each component fires its event exactly once across a StrictMode
double-mount and across an irrelevant prop/state change.
**Pick up when:** next analytics-hardening pass, or alongside any edit to these effects. Agent-fixable.
