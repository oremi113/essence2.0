---
id: 2026-09-15-commit-paid-render-bypasses-hourly-cap-and-ledger
priority: P3
status: open
opened: 2026-09-15
resolved:
owner_paired: true
summary: `/commit` — the DEFAULT paid ElevenLabs render path — is capped only per-generation; it never checks the hourly cap and never writes a usage-ledger row, so real voice-render spend is both under-fenced and invisible *(triage 2026-09-15)*
---

# `/commit` (the default paid render path) bypasses the hourly cap and the usage ledger

*(triage 2026-09-15 — Step 6 spend-path review; sibling of FU-92)*

`src/app/api/messages/commit/route.ts:66` is the only cost gate on the commit
render: it checks the per-generation `audio_render_cap` (default 3) and nothing
else. It never calls `countGenerationsThisHour(...)` and never records a
`usage_events` row. The hourly cap (`maxGenerationsPerHour`, default 20) only
counts ledger rows tagged `STEP6_GENERATE_ACTION`, written by `/generate` and the
non-deferred regenerate arm (`src/lib/messages/cost-controls.ts:135-140`). In the
**shipped default mode** — deferred audio, ON by default since 2026-09-04
(`cost-controls.ts:80-82`) — `/commit` is *the* action that spends a paid
ElevenLabs render, yet it is the one paid path the hourly fence and the ledger
don't see.

**Why it matters:** the cost-control module's own header
(`cost-controls.ts:5-11`) states the hourly cap exists to "stop ElevenLabs …
spend from being a loophole." That fence doesn't cover the primary paid path, and
because no ledger row is written, actual voice-render spend never shows up in the
hourly counter or in any usage accounting. This is less severe than FU-92
(`retry_audio`, which has *no* cap at all) because `/commit` is bounded by the
per-generation cap of 3 and the one-active-pending gate — the realistic ceiling
is ~20 generations/hr × 3 renders = ~60 unmetered paid renders/hour/user — but it
is unmetered and unfenced on the default path, and it went from an edge concern to
the main concern the day deferred audio became the default. Vendor-cost exposure
plus zero observability of real spend.

**Fix shape:** before the render in `/commit`, check
`countGenerationsThisHour(...) >= maxGenerationsPerHour` and record a `usage_events`
row on success (reuse the exact gate + ledger pattern the control-arm regenerate
already uses at `regenerate/route.ts`). Best done as one Step 6 cost-control pass
that also closes FU-92 (`retry_audio`) so every paid-render route funnels through
the same hourly cap + ledger. Owner-paired (vendor-spend / cost-control policy).

**Pick up when:** the next Step 6 cost-control pass, or before launch — same batch
as FU-92.
