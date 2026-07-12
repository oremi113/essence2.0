---
id: 2026-06-30-journey-voice-profile-ready-emits-voice-profile-id
legacy_id: 100
priority: P4
status: open
opened: 2026-06-30
resolved:
summary: Journey `voice_profile_ready` emits `voice_profile_id` unguarded → a `null` id can enter the funnel *(triage 2026-06-30)*
---

# Journey `voice_profile_ready` emits `voice_profile_id` unguarded → a `null` id can enter the funnel

*(triage 2026-06-30)*
`src/components/voice/VoiceCreationView.tsx:37-42` — the success effect fires when `viewState ===
"success"` and passes `voice_profile_id: voiceProfileId`, where `voiceProfileId` (from `searchParams`)
is `string | null`. No guard ties the success view to a non-null id. The analytics doc
(`docs/analytics/2026-06-16-journey-funnel-events.md:124`) says `null` "shouldn't reach success" — but
nothing enforces it, so a future refactor reaching `success` without the param (or a first-paint race)
emits a `null`-id ready event that can't be joined back to `voice_profiles`.
**Why it matters:** low blast radius today (success is only reachable with an id), but a malformed funnel
row is silent and permanent once written, and the doc treats the invariant as load-bearing without code
backing it.
**Fix shape:** guard the emit — `if (viewState === "success" && voiceProfileId && !readyFired.current)`,
or assert-and-skip when the id is absent.
**Pick up when:** next time the voice-creation flow is touched. Agent-fixable.
