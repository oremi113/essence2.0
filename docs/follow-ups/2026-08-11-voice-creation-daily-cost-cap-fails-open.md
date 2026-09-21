---
id: 2026-08-11-voice-creation-daily-cost-cap-fails-open
priority: P3
status: open
opened: 2026-08-11
resolved:
summary: "The voice-creation daily cost cap fails **open** on a DB error - the only server ceiling on billed ElevenLabs voice-clone spend *(triage 2026-08-11, salvaged from the monolith 2026-09-21)*"
---

# The voice-creation daily cost cap fails **open** on a DB error — the only server ceiling on billed ElevenLabs voice-clone spend

*(triage 2026-08-11 - originally written into the legacy `docs/FOLLOW_UPS.md`
monolith by PR #127, which never landed. Salvaged into the per-file ledger on
2026-09-21 and verified to have no existing per-file entry before copying.)*

`src/lib/rate-limit.ts:97-102` — `countRecentEvents` returns `0` on any query error, and
`checkVoiceCreationLimit` (`:184-201`) treats `0` as under-cap, so a read failure → **allowed**.
`recordUsageEvent` (`:133-136`) also swallows insert errors, so a failed ledger write means a
*billed* attempt is never counted. Guards the paid call at
`src/app/api/voice-profiles/[id]/start/route.ts`.

**Why it matters:** With the subscription gate flag-OFF (FU-22) and the in-memory dedup explicitly
non-authoritative, the 5/day cap is the *only* server-side brake on billed ElevenLabs voice-clone
creation. It is soft on both DB failure modes, so a `usage_events` read/write incident lifts the
brake for **every user at once** — an aggregate vendor-cost spike arriving exactly during a DB
incident. (The fail-open was inherited from a generic helper written for message caps —
"so users aren't locked out" — and silently applies to the money path.)

**Fix shape:** For the cost-guarding caps (`checkVoiceCreationLimit`, arguably `checkSignedUrlLimit`),
fail *closed* — or degrade to a conservative fallback cap — on `countRecentEvents` error, and
distinguish "no events" from "couldn't read events." Leave the UX caps (message limits) failing open.

**Pick up when:** cost-hardening pass, or before launch when ElevenLabs spend is live. Agent-fixable.
