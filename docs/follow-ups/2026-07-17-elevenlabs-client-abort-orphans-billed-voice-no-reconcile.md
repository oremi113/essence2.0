---
id: 2026-07-17-elevenlabs-client-abort-orphans-billed-voice-no-reconcile
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: On the 60s ElevenLabs request timeout the code returns a definitive failure with no vendor-side reconciliation, so a voice ElevenLabs already created (and billed) is orphaned and the retry mints a second one *(triage 2026-07-17)*
---

# A client-side timeout on the ElevenLabs call can orphan a voice we already paid for

*(triage 2026-07-17)*

`src/lib/elevenlabs.ts:8` sets `REQUEST_TIMEOUT_MS = 60_000`; on timeout the `AbortController`
(l.62) fires and the catch path (l.106) surfaces the abort as a failure, which the `/start` route turns
into a 504 → `markVoiceProfileFailed`.

`controller.abort()` only cancels *our* read of the response. ElevenLabs may have already finished
creating the voice on their side (and billed for it) by the time we give up waiting. We record the
attempt as failed, the user retries, and `createVoiceFromClips` creates a **second** voice — with no
attempt to find or reuse the possibly-orphaned first one.

**Why it matters:** it's a real (if low-probability) money-leak — the user is billed for a voice the
app then abandons, and the retry doubles the charge. It's the same "paid render, lost result" family as
the stale-timeout item (`2026-07-14-voice-create-stale-threshold-shorter-than-max-duration`) but via a
different mechanism (the 60s client-side fetch abort, not the 3-min stale-recovery window), so it needs
its own handling. Probability is low because Instant Voice Clone is usually well under 60s, which is why
this is P3.

**Fix shape:** treat a timeout/abort as an **unknown** outcome, not a definitive failure. Before
re-creating on retry, reconcile against ElevenLabs (e.g. list voices by the deterministic name and
reuse a match), or persist a pending vendor reference so the retry can dedupe. At minimum, distinguish
the abort case so it doesn't record a clean `failed` that hides a possible orphan.

**Pick up when:** the voice-creation reliability / cost-hardening pass (natural pair with the
stale-timeout fix — both are "paid voice, no reconciliation" and want the same reconcile helper).
