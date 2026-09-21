---
id: 2026-07-17-db-rate-limiter-count-then-insert-bypasses-spend-caps
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: The DB rate-limiter counts events then inserts separately (TOCTOU), so concurrent requests all pass the daily voice/message caps at once — the vendor-spend guardrail is bypassable under bursting *(triage 2026-07-17)*
---

# The daily spend caps are count-then-insert, so concurrent requests slip past them

*(triage 2026-07-17)*

`src/lib/rate-limit.ts` — `checkMessageGenerationLimit` (l.164) and `checkVoiceCreationLimit`
(l.184) both work by calling `countRecentEvents` (l.81), comparing to the cap, and only later
recording the event via `recordUsageEvent` (l.108). The count and the insert are two separate
statements with a gap between them. If several requests arrive at the same time, they all read the
same "under the cap" count before any of them has recorded its event, so they all proceed.

The in-memory dedup map (l.44) is explicitly documented as non-authoritative and resets per
instance, so on a serverless deployment two requests landing on different instances skip dedup
entirely and hit this race.

**Why it matters:** these two caps are the guardrail on real ElevenLabs (voice) and LLM (message)
spend — the exact cost exposure this codebase repeatedly hardens against. Because the check isn't
atomic, a user (or a buggy client that fires parallel requests) can overshoot the daily cap and
trigger extra paid renders. The blast radius is bounded (the overshoot is limited to how many
requests land in the race window, not literally unbounded), which is why this is P3 rather than P2 —
but the money axis is real and the code presents the DB as "the guardrail" when it is actually
best-effort.

This is the same non-atomic **check-then-insert class** already flagged for the vault saved-message
cap (`2026-07-14-saved-message-cap-is-check-then-insert-not-race-safe`) and the Stripe duplicate-sub
guard (FU-81) — but it is a **distinct site**: those govern a plan quota and a subscription; this
governs the daily vendor-spend caps in `usage_events`. Worth fixing with the same atomic technique.

**Fix shape:** enforce the cap atomically — a Postgres function/RPC that inserts-the-event-and-counts
in one statement (rejecting when over cap), or a windowed constraint — instead of count-then-insert in
app code. If atomicity is deferred, at minimum change the code comments/contract to state these caps
are best-effort, not a hard spend ceiling.

**Pick up when:** the next cost-control / spend-hardening pass (folds naturally with the FU-81 /
saved-message-cap atomicity work — one RPC pattern covers all of them), or before opening the app to
untrusted traffic.
