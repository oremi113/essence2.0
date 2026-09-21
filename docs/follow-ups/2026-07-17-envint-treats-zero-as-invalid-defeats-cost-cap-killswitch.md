---
id: 2026-07-17-envint-treats-zero-as-invalid-defeats-cost-cap-killswitch
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: envInt accepts a cap only when n > 0, so setting any cost/rate cap to 0 to hard-stop spend silently reverts to the built-in default — the "throttle to zero" kill-switch does nothing *(triage 2026-07-17)*
---

# Setting a cost cap to 0 to stop spend silently falls back to the default

*(triage 2026-07-17)*

The same `envInt` helper is duplicated in two files:
- `src/lib/messages/cost-controls.ts:20`
- `src/lib/rate-limit.ts:16`

Both read an env override and accept it only when `!Number.isNaN(n) && n > 0`. Because the guard is
`> 0` (not `>= 0`), the value `0` fails the test and the function returns the built-in `fallback`
instead.

**Why it matters:** every spend/abuse cap in Step 6 and the rate-limiter is env-overridable precisely
so an operator can dial it down in an incident. But the one value an operator would reach for to
**hard-stop** a runaway vendor bill — `STEP6_MAX_AUDIO_RENDERS=0`,
`STEP6_MAX_GENERATIONS_PER_USER_PER_HOUR=0`, `RATE_LIMIT_MAX_VOICE_CREATIONS_PER_DAY=0` — is silently
ignored, and renders keep flowing at the default rate (3 / 20 / 5). An operator who set it and moved on
would believe they had stopped the spend while ElevenLabs/LLM calls continue. A kill-switch that
doesn't kill is worse than none, because it creates false confidence during exactly the moment it's
needed.

**Fix shape:** accept `n >= 0` (guard only against `NaN` and negatives), so `0` is a valid "disable /
block everything" value, keeping the fallback strictly for missing/blank/non-numeric input. Fix both
copies (and consider consolidating the duplicated helper into one shared util so they can't drift).

**Pick up when:** the next cost-control pass, or immediately if a "throttle spend to zero" runbook step
is ever relied on. Agent-fixable (one-character comparison change in two files; no migration).
