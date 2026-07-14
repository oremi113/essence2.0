---
id: 2026-07-14-failed-voice-create-attempts-count-against-daily-cap
priority: P3
status: open
opened: 2026-07-14
resolved:
summary: Rejected/failed voice-creation attempts (too few clips, clips too short, lock error) still count against the 5/day cap because the cap counts events by action and ignores outcome → a fumbling user can lock themselves out of voice creation for 24h *(triage 2026-07-14)*
---

# Failed voice-creation attempts burn the daily voice-creation cap

*(triage 2026-07-14)*
`src/app/api/voice-profiles/[id]/start/route.ts:122-128` records the `voice_create` usage event with
outcome `"started"` **before** the min-clip / min-bytes validation runs (`:148-175`). On a validation
failure the route dutifully updates that event's outcome to `"rejected"` (`:156`, `:165`) or `"error"`.
But the daily cap doesn't care about outcome: `checkVoiceCreationLimit` (`src/lib/rate-limit.ts:184-201`)
calls `countRecentEvents`, which counts rows by `action` + time window only and never filters on outcome
(`:81-95`). So every rejected attempt — none of which ever called (or billed) ElevenLabs — still counts
against the 5-per-day cap enforced by `assertCanStartVoiceCreation`.

**Why it matters:** a user who taps "create my voice" before recording enough audio gets "not enough
clips," records a bit more, taps again, still short, and so on. After five such fumbles — a very ordinary
pattern for a first-time, older user — they're locked out of voice creation for 24 hours despite never
having successfully started one. The cap exists to bound ElevenLabs spend; charging it for attempts that
never reach ElevenLabs is simply miscounting, and it punishes exactly the hesitant users the product is
built for.

**Fix shape:** record the `voice_create` ledger row only *after* validation passes (right before the
processing lock / ElevenLabs call), **or** have `checkVoiceCreationLimit` count only `started`/`success`
outcomes so rejected attempts don't consume the cap. The former is cleaner (nothing gets logged for an
attempt that never began).

**Pick up when:** next voice-creation / rate-limit correctness pass, or before launch. Agent-fixable.
