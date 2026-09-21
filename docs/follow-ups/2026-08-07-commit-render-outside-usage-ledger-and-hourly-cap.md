---
id: 2026-08-07-commit-render-outside-usage-ledger-and-hourly-cap
priority: P3
status: open
opened: 2026-08-07
resolved:
owner_paired: true
summary: `/api/messages/commit` renders paid ElevenLabs audio but writes no `usage_events` ledger row and sits outside the hourly generation cap → "Hear this in your voice" spend is uncounted *(triage 2026-08-07)*
---

# The "Hear this in your voice" commit render is invisible to the usage ledger and the hourly cost cap

*(triage 2026-08-07)*
`src/app/api/messages/commit/route.ts:76` calls `generateSpeech` (a paid ElevenLabs render). The route imports no `recordUsageEvent` (`:16-28`) and gates only on the per-generation `audio_render_count` (`:66-68`, `audio_render_cap`).

By contrast, both sibling render paths meter properly: `generate/route.ts:223-228` and `regenerate/route.ts:218-225` each check `countGenerationsThisHour(...) >= maxGenerationsPerHour` (`hourly_max`) **and** write a `recordUsageEvent` ledger row. `/commit` does neither, so every commit render is (a) absent from the `usage_events` ledger that `countGenerationsThisHour` reads, and (b) outside the hourly global backstop.

**Why it matters:** ElevenLabs spend from the commit path is uncounted — any hourly/daily cost accounting or cap that reads `usage_events` under-counts real vendor spend, and the hourly cap can't restrain a burst of commits. Distinct from FU-92 (`retry_audio`, a different route): `/commit` at least has a per-generation cap, so this is an accounting/cap-coverage gap rather than fully-unbounded spend — but it's the same vendor-spend-visibility class the P-band exists for, and it grows real once S5 turns ElevenLabs on.

**Fix shape:** record a `usage_events` entry for the commit render (mirror the generate/regenerate ledger write) and, if commit renders should count toward spend limits, gate `/commit` on the same `countGenerationsThisHour` hourly counter before rendering. **Owner-paired: cost-control / vendor-spend policy — confirm whether commits should count against the hourly cap.** Drop a `docs/analytics/` note if the ledger action key changes.

**Pick up when:** before launch, or the next Step 6 cost-control pass. Sibling of FU-92 / FU-22's cost-exposure lineage.
