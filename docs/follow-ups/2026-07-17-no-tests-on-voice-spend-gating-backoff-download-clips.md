---
id: 2026-07-17-no-tests-on-voice-spend-gating-backoff-download-clips
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: The logic that decides whether another billed ElevenLabs attempt is allowed (backoff retry gate, clip-download spend gate, createVoiceFromClips) has zero unit coverage *(triage 2026-07-17)*
---

# The code that governs paid voice-creation retries has no tests

*(triage 2026-07-17)*

Several modules on the voice-creation **spend path** have no unit coverage (only `persistVoiceReady`,
`promoteTrainingClipPath`, and `resolver` are tested):

- `src/lib/voice-training/backoff.ts` — `isVoiceProfileRetryAllowed`, the single source of truth for
  whether another *billed* ElevenLabs attempt is permitted (attempt cap + backoff wait window).
- `src/lib/voice-creation/download-clips.ts` — `downloadClipsForVoiceProfile`, the last gate before the
  vendor call (validates clips exist / are usable across its `kind` branches).
- `src/lib/elevenlabs.ts` — `createVoiceFromClips`, the actual paid call and its
  webm/mime + timeout handling.

**Why it matters:** these are the pieces that decide when the app spends money with ElevenLabs. They
are pure or near-pure and easy to test, yet a regression in the cap boundary or the backoff clamp would
silently change spend behavior — more paid attempts than intended, or users wrongly locked out — with
nothing to catch it. Given how much of this backlog is about vendor-spend exposure, the guardrail logic
itself running untested is a real gap on a shipping money path.

**Fix shape:** add focused unit tests:
- `isVoiceProfileRetryAllowed` — cap boundary at `attemptCount === MAX`, each backoff index including
  the clamp at index >= length, and the `null lastAttemptAt` path.
- `downloadClipsForVoiceProfile` — its handful of `kind` branches (including the transient-error vs
  genuinely-no-clips distinction).
- `createVoiceFromClips` — the webm/empty-mime handling and the timeout/abort branch.

Follows the house "extract, then test" pattern (these units are already extracted).

**Pick up when:** the next test-coverage pass, or bundled with any change to the retry/backoff logic
(don't ship a behavior change to these untested). Agent-fixable.
