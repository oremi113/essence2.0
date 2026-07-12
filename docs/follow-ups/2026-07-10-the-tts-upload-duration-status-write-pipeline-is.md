---
id: 2026-07-10-the-tts-upload-duration-status-write-pipeline-is
legacy_id: 97
priority: P3
status: open
opened: 2026-07-10
resolved:
summary: TTS→upload→duration→status-write pipeline implemented twice (`audio.ts` vs `commit/route.ts`) → drift on a vendor-spend path *(triage 2026-07-10)*
---

# The TTS→upload→duration→status-write pipeline is implemented twice and will drift

*(triage 2026-07-10)*
`src/lib/messages/audio.ts:68-121` (`generateAndStoreAudio`) and
`src/app/api/messages/commit/route.ts:76-128` (deferred-audio candidate-promotion) both implement
the same core: render via ElevenLabs → upload to `pendingGenerationAudioPath` → derive duration via
`mp3DurationMsFromByteLength` → write `audio_path` / `audio_status` / `audio_duration_ms`. The two
copies already have subtly different success-mark error handling, so a future change to the storage
path, duration calc, or upload options must be made in both or they silently diverge.
**Why it matters:** duplication on a vendor-spend path drifts out of sync — a fix or cost-control
tweak applied to one renderer and not the other reintroduces a bug on the other flow (how FU-27's
per-category-voice-settings gap originally spread).
**Fix shape:** extract the shared render → upload → duration core into one helper both callers reuse;
keep each caller's distinct pre/post bookkeeping local.
**Pick up when:** next Step 6 audio-pipeline touch, or an API-consolidation pass. Agent-fixable.
