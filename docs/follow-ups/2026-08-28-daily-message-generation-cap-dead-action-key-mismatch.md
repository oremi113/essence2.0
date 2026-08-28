---
id: 2026-08-28-daily-message-generation-cap-dead-action-key-mismatch
priority: P3
status: open
opened: 2026-08-28
resolved:
owner_paired: false
summary: The daily message-generation cost cap counts usage events keyed `"message_generate"`, but the pipeline only ever records `"step6_generate"` → the daily ceiling never fires (only the 20/hr cap is live) *(triage 2026-08-28)*
---

# The daily message-generation cap is dead — action-key mismatch

*(triage 2026-08-28)*
The "daily backstop" on the paid LLM+TTS generation path is wired to a ledger key the pipeline never writes:

- `src/lib/rate-limit.ts:171` — `checkMessageGenerationLimit` counts `usage_events` with action `"message_generate"`.
- `src/lib/guards.ts:55` — `assertCanGenerateMessage` calls that check (and `generate/route.ts:65` calls the guard, so it is live on the real route).
- But the routes record `action: STEP6_GENERATE_ACTION` = `"step6_generate"` (`src/lib/messages/cost-controls.ts:85`, written at `generate/route.ts:230` and `regenerate/route.ts:227`). A repo-wide grep shows **nothing writes a `"message_generate"` usage event** — the only other occurrence is the `assertPlanAllows(userId, "message_generate")` stub arg, not a ledger write.

So `count` is always 0 and `CAPS.maxMessagesPerDay` can never trigger. The generate route's own comment — "Ownership + ready + vendor_voice_id (and a daily backstop)" (`generate/route.ts:64`) — describes a control that does nothing. The only live generation cap is the 20/hour hourly cap in `cost-controls.ts`.

**Why it matters:** a spend ceiling on the paid ElevenLabs+LLM path silently limits nobody — a false sense of a daily backstop. Not an open leak (the hourly cap still meters, capping sustained abuse at ~20/hr), so P3 rather than P2, but it's a dead safeguard on a vendor-spend path exactly like the cost-exposure landmines this system exists to catch.

**Fix shape:** align the key — either record a `"message_generate"` event on generate, or point `checkMessageGenerationLimit` at `STEP6_GENERATE_ACTION`. Note the product dimension: switching the cap *on* means picking a `maxMessagesPerDay` that won't block legitimate heavy users, so confirm the intended daily ceiling before flipping it live.

**Pick up when:** next Step 6 cost-control pass. Sibling of the ElevenLabs cost-exposure lineage ([[2026-07-10-retry-audio-renders-paid-elevenlabs-audio-with-no]], FU-22). Agent-fixable once the intended cap value is confirmed.
