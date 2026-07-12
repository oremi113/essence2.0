---
id: 2026-07-10-single-clip-playback-retry-guard-resets-itself-on
legacy_id: 94
priority: P3
status: open
opened: 2026-07-10
resolved:
summary: Single-clip playback retry guard resets itself every fetch → an undecodable clip bursts the rate-limited playback-url endpoint *(triage 2026-07-10)*
---

# Single-clip playback retry guard resets itself on every fetch → an undecodable clip bursts the rate-limited playback endpoint

*(triage 2026-07-10)*
`src/components/audio/RecordingUpload.tsx:263` — `loadPlaybackUrl` sets
`playbackRetriedRef.current = false` on every successful fetch. But `handleAudioError` (`:277-286`)
also calls `loadPlaybackUrl` on its one-retry path. So for a clip that persistently fails to
*decode* (corrupt/truncated upload, unsupported codec — not an expired URL): audio errors →
`handleAudioError` sets the ref true and calls `loadPlaybackUrl` → fetch succeeds → **ref reset to
false** → new URL set → audio errors again → ref false again → retry … The sibling list-playback
flow (`playClip`/`playbackRetryUsedRef`, `:288-307`) is correctly bounded, so the two have drifted.
**Why it matters:** the "one retry" guard doesn't bound anything — an undecodable clip fires a rapid
burst of `POST /api/audio/playback-url` until the rate limiter 429s. Self-throttles and spends only
the user's budget, but it's console-spam, wasted requests, and a correctness drift from the sibling.
**Fix shape:** stop resetting `playbackRetriedRef` inside `loadPlaybackUrl`; reset only when a new
clip is selected or after a clean play — mirror `playClip`/`playbackRetryUsedRef`.
**Pick up when:** next time the record/playback UI is touched. Agent-fixable.
