---
id: 2026-07-10-retry-audio-renders-paid-elevenlabs-audio-with-no
legacy_id: 92
priority: P2
status: open
opened: 2026-07-10
resolved:
owner_paired: true
summary: `retry_audio` renders paid ElevenLabs audio with NO cost cap, hourly gate, or ledger → unbounded vendor spend *(triage 2026-07-10)*
---

# `retry_audio` renders paid ElevenLabs audio with no cost cap, hourly gate, or ledger entry

*(triage 2026-07-10)*
`src/app/api/messages/regenerate/route.ts:94-135` — the `mode: "retry_audio"` branch checks only
that `generated_text` exists, resets `audio_status` to pending, and calls `generateAndStoreAudio`
(a paid ElevenLabs render). Unlike the control arm 80 lines below (`regenerate_cap`, `hourly_max`,
plus a `recordUsageEvent` ledger row at l.225), `retry_audio` has **none** — no attempt cap, no
hourly backstop, no usage ledger, and no precondition that the prior audio actually failed (it
resets status regardless).
**Why it matters:** the endpoint is a plain authenticated `POST`. Any signed-in client can call
`retry_audio` on one existing generation in a loop and rack up unbounded paid ElevenLabs renders —
evading even the 20/hr `hourly_max` global backstop. The exact unmetered-ElevenLabs cost exposure
the P1/P2 band exists for; a landmine (not firing in the one-tap human happy path) rather than an
active leak.
**Fix shape:** before the render, record a `started` usage event and check
`countGenerationsThisHour(...) >= maxGenerationsPerHour` (reuse the control-arm gate), count
`retry_audio` renders against a per-generation attempt cap, and require `audio_status !==
'succeeded'` so a succeeded render can't be re-billed. Owner-paired (cost-control / vendor-spend).
**Pick up when:** before launch, or the next Step 6 cost-control pass. Sibling of FU-22's lineage.
