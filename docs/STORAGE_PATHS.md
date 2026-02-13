# Storage paths (Phase 4)

- **Bucket:** `essence-audio` (private). Create in Supabase Dashboard: Storage → New bucket → name `essence-audio`, set to private.
- **Paths are server-authored only.** Client never constructs paths.

## Training clips

`users/{userId}/voice-profiles/{voiceProfileId}/training-clips/{trainingClipId}/source.webm`

## Message audio (pattern for later)

`users/{userId}/voice-profiles/{voiceProfileId}/messages/{messageId}/audio.mp3`

Playback is only via short-lived signed download URLs from the server.
