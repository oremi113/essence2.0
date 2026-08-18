---
id: 2026-08-18-daily-generation-cost-cap-is-silently-dead
priority: P2
status: open
opened: 2026-08-18
resolved:
summary: The daily message-generation cost cap counts a stale action key (`message_generate`) that nothing writes anymore → the 20/day ElevenLabs+LLM backstop never trips *(triage 2026-08-18)*
---

# The daily message-generation cost cap is silently dead (action-key mismatch)

**What:** `checkMessageGenerationLimit` (`src/lib/rate-limit.ts:164-181`, called from
`assertCanGenerateMessage` at `src/lib/guards.ts:52` as the "daily backstop") counts
`usage_events` rows whose `action = "message_generate"` over the last 24h. But every
Step 6 generation route now records `action = STEP6_GENERATE_ACTION = "step6_generate"`
(`src/lib/messages/cost-controls.ts:85`, written at
`src/app/api/messages/generate/route.ts:230` and
`src/app/api/messages/regenerate/route.ts:227`). A repo-wide grep confirms **nothing
writes `"message_generate"` anymore** — so the daily counter always reads 0 and the cap
never fires.

**Why it matters:** the intended per-day ceiling on paid ElevenLabs + LLM spend
(`CAPS.maxMessagesPerDay`, ~20/day) is a no-op. The only limit still doing real work is
the rolling-hourly cap (`countGenerationsThisHour`, which correctly counts
`step6_generate`), so a determined user can sustain ~20/hour ≈ ~480 paid generations/day
against the vendor instead of the intended 20. It's a defence-in-depth backstop against
runaway vendor cost that has quietly stopped defending — the kind of gap that stays
invisible until a bill or an abuse spike surfaces it.

**Fix shape:** point `checkMessageGenerationLimit` (and the `assertPlanAllows("...")`
label) at `STEP6_GENERATE_ACTION` / `"step6_generate"`, OR record a `"message_generate"`
ledger row alongside the hourly one — pick one action key and use it on both the write and
the read. Add a unit test that asserts the daily cap actually blocks the (N+1)th
generation, so the two keys can't silently drift apart again (this is exactly the failure
a test would have caught).

**Pick up when:** next time anyone touches the Step 6 cost-control / rate-limit layer, or
sooner if vendor spend looks higher than the intended daily ceiling. Agent-fixable (server
logic + a test; no product decision, no never-touch surface).
