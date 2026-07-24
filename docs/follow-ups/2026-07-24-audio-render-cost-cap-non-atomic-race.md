---
id: 2026-07-24-audio-render-cost-cap-non-atomic-race
priority: P3
status: open
opened: 2026-07-24
resolved:
owner_paired: false
summary: The audio-render cost cap is a non-atomic read-then-absolute-set — two racing `/messages/commit` calls both pass the `audio_render_count >= cap` check and both write `snapshot+1`, so two paid ElevenLabs renders bill while the counter advances by one, walking spend past the cap *(triage 2026-07-24)*
---

# Audio-render cost cap is non-atomic (read-then-absolute-set), so concurrent commits can over-spend past the cap

*(triage 2026-07-24 — discovery. Distinct from the promote-write-failed case cited in
`commit/route.ts`: here **both** writes succeed and the absolute-set still defeats the cap. Same
"non-atomic guard" class the repo already tracks for the Stripe duplicate-sub guard, FU-81.)*

`src/app/api/messages/commit/route.ts` — `/commit` is the only Deferred-Audio action that spends a paid
ElevenLabs render, capped by `audio_render_count >= STEP6_LIMITS.maxAudioRenders`. The count is read
from a snapshot (l.49), checked at l.66, then on success written as an **absolute set to
`snapshot + 1`** (l.114 `const nextRenderCount = gen.audio_render_count + 1;` → l.125
`audio_render_count: nextRenderCount`) — not an atomic SQL increment or a conditional update. The
in-memory dedup is explicitly "UX polish only — NOT a guardrail" (5 s, per-instance — useless across
serverless instances or a scripted client). Two commits that race both read the same stale count `N`,
both pass the `>= cap` check, both spend a paid TTS render, and both write `N + 1`.

**Why it matters:** two paid renders get billed but the counter advances by only one, so the cap can be
walked past and real vendor cost incurred beyond `maxAudioRenders`. Low-frequency (needs concurrent
commits on one generation) but it's a money path, which is why it's worth logging rather than shrugging
off.

**Fix shape:** make the spend-and-count atomic — either a conditional update guarded on the read value
(`.eq("audio_render_count", gen.audio_render_count)`, treating a 0-row result as "lost the race, abort")
or an RPC doing `audio_render_count = audio_render_count + 1 WHERE audio_render_count < cap`, and only
call TTS after the slot is reserved.

**Pick up when:** the next Step 6 cost-control pass, alongside the other vendor-spend hardening
(`retry_audio` cap FU-92, etc.).
