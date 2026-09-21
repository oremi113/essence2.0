---
id: 2026-08-25-commit-render-bypasses-hourly-cap-and-ledger
priority: P3
status: open
opened: 2026-08-25
resolved:
owner_paired: true
summary: Deferred-Audio `/commit` renders paid ElevenLabs audio with only the per-message cap — no hourly gate, no usage_events ledger row *(triage 2026-08-25)*
---

# Deferred-Audio `/commit` paid render skips the hourly cap and the usage ledger

*(triage 2026-08-25)*
`src/app/api/messages/commit/route.ts:66,76` — commit is, by its own docstring (l.5), "the only
Deferred-Audio action that spends a paid voice render," yet it gates only on the **per-message**
`audio_render_cap` (l.66) before calling `generateSpeech` (l.76). It never calls
`countGenerationsThisHour` (the per-user hourly cap) and never writes a `recordUsageEvent` ledger
row. The control-arm siblings do both: `generate/route.ts` and `regenerate/route.ts` check the
hourly cap **and** record a `step6_generate` ledger row *before* spending a render.
`src/lib/messages/cost-controls.ts:5-14` explicitly names the hourly cap as one of the axes that
"stop ElevenLabs + LLM spend from being a loophole."

**Why it matters:** the whole path is behind `DEFERRED_AUDIO_ENABLED` (off by default), so there is
**zero live exposure today** — this is a landmine, not an active leak. But that flag is the intended
future model (verified in FU-53), and when it flips, `/commit` becomes the *dominant* paid path:
its renders are invisible to the `usage_events` ledger (so per-user ElevenLabs throughput can't be
observed or reconciled on the main paid path) and are not throttled by the hourly backstop (a user
can commit up to `maxAudioRenders` = 3 paid renders per generation, on top of the hourly-capped
generates, with none of those commit renders counted). **Escalate to P2 when the flag is turned on.**

**Fix shape:** before the render at l.76, check `countGenerationsThisHour(...) >= maxGenerationsPerHour`
(reuse the control-arm gate) and record a `started` usage event, finalizing it after the upload — so
commit renders count against the same hourly ceiling and land in the ledger like every other paid
render. Owner-paired (cost-control / vendor-spend).

**Related, fold in the same pass (both low, verified this triage):**
- **Contradictory cap docs.** `cost-controls.ts:55` documents `maxAudioRenders` as "first listen +
  each committed candidate" (free first render counts), but `generate/route.ts` never increments
  `audio_render_count` for the free first listen ("counts committed re-recordings only"), so the
  real ceiling is 1 (first listen) + 3 (commits) = 4 renders/message, not the ≤3 the cap's own
  definition implies. Reconcile the two comments so the next maintainer doesn't "fix" the wrong side.
- **Deferred-Audio text candidates aren't in the ledger either.** `generate/route.ts:126` (reshape)
  and `regenerate/route.ts:161` (variant) call the paid LLM `generateMessageText` under the deferred
  flag and return before any `recordUsageEvent`. Cheap and capped by `edit_note_depth` /
  `text_reroll_cap`, so minor — but it means per-user LLM throughput is unobservable on the deferred
  arm. Note it while wiring the commit ledger row above.

**Pick up when:** before `DEFERRED_AUDIO_ENABLED` is turned on, or the next Step 6 cost-control pass.
Distinct route from FU-92 (`retry_audio`, which has *no* cap at all); this one has the per-message
cap but no hourly gate/ledger.
