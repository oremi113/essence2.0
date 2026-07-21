---
id: 2026-07-21-daily-message-generation-cost-cap-counts-wrong-action
priority: P3
status: open
opened: 2026-07-21
resolved:
owner_paired: false
summary: The daily message-generation cost backstop counts `usage_events` action `message_generate`, but the pipeline only ever writes `step6_generate` → the 20/day cap silently never fires *(triage 2026-07-21)*
---

# Daily message-generation cost cap is dead code — it counts an action the pipeline never writes

*(triage 2026-07-21 — surfaced reading the Step 6 cost-control layer)*

Every Step 6 generation runs `assertCanGenerateMessage` (`src/app/api/messages/generate/route.ts:65`),
which calls `checkMessageGenerationLimit` (`src/lib/guards.ts:55`). That check counts `usage_events`
rows whose `action = "message_generate"` over 24h against a 20/day cap
(`src/lib/rate-limit.ts:164-181`, `RATE_LIMIT_MAX_MESSAGES_PER_DAY`). But the generate and regenerate
routes only ever *record* `action = STEP6_GENERATE_ACTION` — i.e. `"step6_generate"`
(`src/app/api/messages/generate/route.ts:230`, `regenerate/route.ts:227`;
`STEP6_GENERATE_ACTION` = `"step6_generate"` in `src/lib/messages/cost-controls.ts:85`). Nothing
anywhere writes a `"message_generate"` usage event (the only other references are the `assertPlanAllows`
stub's string arg in `guards.ts:52` and a doc comment). So the count is **always 0** and the daily cap
can never trip.

**Why it matters:** there are two per-user spend ceilings on paid ElevenLabs/LLM generation — an
hourly one and a daily one. The hourly cap works (`countGenerationsThisHour` in `cost-controls.ts:130`
correctly counts `step6_generate`), so total spend is still *bounded* — this is not an open leak. But the
daily backstop that was written to be the tighter ceiling is a silent no-op, so the effective ceiling is
~24× looser than intended, and anyone reading the code (or ops) would believe a guardrail is live that
isn't. The generate route's own header comment describes "a daily backstop" that does not exist.

**Fix shape:** point `checkMessageGenerationLimit` at `STEP6_GENERATE_ACTION` so it counts the events the
pipeline actually writes (cleanest — one line), OR record a `"message_generate"` usage event on the
generate path. Then add a unit test asserting the daily counter increments per generation and blocks at the
cap — the house "extract, then test" bar for a cost guardrail. Note `checkMessageGenerationLimit` is also
called only via `assertCanGenerateMessage`; confirm no other caller depends on the current (broken)
semantics before changing the action string.

**Pick up when:** next time the Step 6 cost-control layer is touched, or before the public launch cost
review — a dead spend guardrail should not ship believed-live. Not user-facing today (hourly cap still
bounds spend).
