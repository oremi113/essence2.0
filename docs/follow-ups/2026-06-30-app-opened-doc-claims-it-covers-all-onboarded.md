---
id: 2026-06-30-app-opened-doc-claims-it-covers-all-onboarded
legacy_id: 102
priority: P4
status: decision
opened: 2026-06-30
resolved:
summary: "Analytics doc↔code drift: `app_opened` doc says all onboarded returns; code fires only voice-ready Home B *(triage 2026-06-30)*"
---

# `app_opened` doc claims it covers all onboarded returns; code fires it only in voice-ready Home B

*(triage 2026-06-30)*
`src/app/home/page.tsx:94` (beacon inside the Home B branch only, after the Home A early-return at
`:67-79`) vs `docs/analytics/2026-06-16-journey-funnel-events.md:134`. The retention anchor
`journey.app_opened` renders only inside the `voiceProfile.status === "ready"` (Home B) branch; an
onboarded user who returns *before* their voice finishes processing hits the Home A stub and emits
nothing. The doc says it "Fires: On render of `/home` for an authenticated, onboarded user" — overclaiming
relative to the code. (The funnel diagram positions `app_opened` after voice-ready, so Home-B-only firing
may be intended — making this a doc-precision / intent-reconciliation question, not a clear bug.)
**Why it matters:** until reconciled, anyone reading the retention query (`:196-206`) can mis-trust it for
the pre-voice-ready cohort — either the doc is wrong (fix one sentence) or Home A should fire it too.
**Fix shape:** decide intended scope. If retention means voice-ready-completed users, tighten the doc
wording at `:134`. If pre-voice-ready returns count, hoist `<JourneyBeacon event={appOpened} />` above the
`voiceProfile.status` branch. Telemetry-impacting → drop a `docs/analytics/` note either way.
**Pick up when:** before the first retention-funnel read is trusted, or whenever Home A gets its own brief.
Analytics-owned (scope is a product/measurement choice).
