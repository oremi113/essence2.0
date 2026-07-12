---
id: 2026-06-30-memory-shelf-playback-controller-in-flight-fetch-race
legacy_id: 99
priority: P3
status: open
opened: 2026-06-30
resolved:
summary: "Memory Shelf playback controller: signed-URL fetch race (no AbortController) → rapid card-switch plays the wrong message; + swallowed resume failure; + dead `retry()`; no unit coverage *(triage 2026-06-30)*"
---

# Memory Shelf playback controller — in-flight fetch race, swallowed resume failure, and a dead `retry()`

*(triage 2026-06-30)*
`src/components/screens/shelf/usePlaybackController.ts` — `play()` at `:87-138`, the resume toggle at
`:90-98`, `retry()`/`lastAttemptedIdRef` at `:45-47,:107,:156-161`. Three issues in the single audio
engine behind the Memory Shelf (reachable from TabNav, Home B, record, vault-limit, save-confirmation):
- **Fetch race (the substantive one).** `play(messageId)` does `await fetch('/api/messages/{id}/play')`
with no `AbortController` and no post-await check that `messageId` is still the active attempt. Tap A
then quickly B: A's fetch is still in flight when `play(B)` runs, and when A resolves it sets
`el.src = A.url` and `await el.play()` on the shared element, clobbering B. Controls say B while A plays.
- **Swallowed resume failure.** The resume branch does `audioRef.current.play().catch(() => {})` then
unconditionally `setIsPaused(false)` and returns `true` (`:92-93`). If resume rejects, the UI flips to
"playing" with no audio and no error.
- **Dead `retry()`.** A fully-implemented `retry()` exists but no production consumer calls it;
`lastAttemptedIdRef` feeds only that dead method.
**Why it matters:** a quick double-tap can play the wrong recording while controls show the other — on a
surface whose whole job is calm playback. Each issue is single-user and self-recovers on the next tap
(no data/money risk → P3). The engine — the most race-prone code on the surface — has **zero unit
coverage** (`memory-shelf-screen.test.tsx` injects a stubbed controller).
**Fix shape:** capture an `AbortController`/monotonic token per `play()`; abort the prior at the top,
pass `signal` to `fetch`, and after the await bail if this call is no longer the active attempt; swallow
`AbortError`. `await` the resume `play()` and restore `isPaused`/surface error on rejection. Wire
`onRetryAudio` → `playback.retry()` or delete `retry()`+`lastAttemptedIdRef`. Add a `renderHook` test.
**Pick up when:** next shelf-audio hardening pass; small and self-contained. Agent-fixable.
