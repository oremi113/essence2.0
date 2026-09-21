---
id: 2026-07-17-loadreadyvoiceprofile-swallows-db-error-wedges-paid-flow
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: loadReadyVoiceProfile ignores the DB read error, so a transient blip returns a terminal "voice not ready" (non-retryable) and hard-blocks the paid regenerate/commit flow *(triage 2026-07-17)*
---

# A momentary DB blip permanently dead-ends the paid message flow

*(triage 2026-07-17)*

`src/lib/messages/route-helpers.ts:67` — `loadReadyVoiceProfile` destructures only `{ data: profile }`
from the Supabase query and never looks at the `error`. Supabase reports a failed read by returning
`{ data: null, error }`, not by throwing, so when the `voice_profiles` read hits a transient error the
function sees `profile === null` and takes the "not ready" branch: it returns a **terminal**
`VOICE_NOT_READY` response with `retryable: false` and HTTP 400.

`regenerate` and `commit` both call this right before spending a paid ElevenLabs render, so the guard
runs on the money path.

**Why it matters:** a momentary database hiccup — the kind that clears itself in a second — gets
reported to the user as "your voice isn't ready" with no retry offered, hard-blocking them out of a
flow whose voice is actually fine. This is the same swallow-the-DB-read-error bug class the codebase
keeps hitting (FU-43/#66 for writes; `2026-07-14-get-subscription-status-reports-none-on-db-read-error`
for a subscription read). Tellingly, `countActivePending` a few files over
(`src/lib/messages/cost-controls.ts:113`) deliberately **fails open** on the same kind of error with a
comment saying "a transient DB error should not wedge the flow" — this helper does the opposite by
omission.

**Fix shape:** capture the `error` from the query. On a genuine query error, return a distinct
retryable 5xx (a transient STORAGE/DB error) so the client can try again. Only return the terminal
`VOICE_NOT_READY` when the row actually loaded and failed the `vendor_voice_id` / `status === 'ready'`
check.

**Pick up when:** the next Step 6 reliability pass, or alongside the other DB-read-error-swallowing
fixes so they can share one pattern. Agent-fixable (a few lines, no migration, no never-touch code).
