---
id: 2026-08-07-voice-start-staleness-window-shorter-than-maxduration
priority: P2
status: open
opened: 2026-08-07
resolved:
owner_paired: true
summary: Voice-creation staleness window (3 min) is shorter than the route's own `maxDuration` (5 min) → a still-running `/start` gets reaped to `failed`, its paid ElevenLabs clone orphaned, and the handler still returns "ready" *(triage 2026-08-07)*
---

# The 3-minute staleness reaper is shorter than the route's own 5-minute budget → a live voice creation gets reaped, its paid clone orphaned, and the client is told "ready" anyway

*(triage 2026-08-07)*
`src/app/api/voice-profiles/[id]/start/route.ts:29` (`maxDuration = 300`, 5 min) vs `:32` (`STALE_PROCESSING_MS = 3 * 60 * 1000`, 3 min); reaper at `:78-95`; success/persist path at `:300-356`.

The processing lock (`last_attempt_at`) is stamped at `:178-190`, **before** the sequential clip download (`:229`) and the ElevenLabs `/voices/add` call (`:295`) — which the file header itself notes "can take 1–2 min" (`:3`). Downloading 10-25 clips plus that call can exceed **3 min** while still comfortably inside the **5-min** budget. During that window a second `POST /start` (a client re-poll, refresh, or navigate-back to the processing page) hits `:81` `elapsed > STALE_PROCESSING_MS`, marks the **live** row `failed` via `markVoiceProfileFailed`, and returns `retry_available: true` to that client.

When the original request's ElevenLabs call then **succeeds**, `persistVoiceReady`'s monotonic guard `.eq("status","processing")` matches **zero** rows (the row is now `failed`), so `applied === false`. But the handler treats that as a "benign concurrent finisher" (`:331-343` comment) and still returns `{ status: "ready" }` at `:356`.

**Why it matters:** three bad outcomes at once on a paid path — (1) the ElevenLabs voice was created and **billed**, but its `vendor_voice_id` is never persisted (orphaned paid clone); (2) the row is stuck `failed` while the first client is told "ready" (state desync — downstream gates that read the profile see `failed`); (3) the second client was told to retry → a **second billed** ElevenLabs clone. Money-leak + desync, latent until real voice creation goes live with users on slow connections.

**Fix shape:** set `STALE_PROCESSING_MS` strictly greater than `maxDuration` (e.g. 6-7 min) so a request inside its own budget can never be reaped; and in the `applied === false` branch, re-read the row — if it is not `ready` (e.g. it was flipped to `failed`), recover the just-created `voice_id` onto the row instead of returning "ready". **Owner-paired: ElevenLabs vendor-spend path — confirm the desired timeout/recovery behavior before changing.**

**Pick up when:** before S5 / real voice-creation go-live. Sibling of the FU-43 lineage (that comment at `:304-307` names FU-43; this is the *inverse* race the constants left open).
