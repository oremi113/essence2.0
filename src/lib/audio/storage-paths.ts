/**
 * Deterministic storage object paths for essence-audio bucket.
 * Server-authored only; client never constructs paths.
 * Audio is never stored in Postgres — only these paths and metadata.
 */

export const AUDIO_BUCKET = "essence-audio" as const;

/** Training clip: users/{userId}/voice-profiles/{voiceProfileId}/training-clips/{trainingClipId}/source.webm */
export function trainingClipObjectPath(
  userId: string,
  voiceProfileId: string,
  trainingClipId: string,
  extension: string = "webm"
): string {
  return `users/${userId}/voice-profiles/${voiceProfileId}/training-clips/${trainingClipId}/source.${extension}`;
}

/** Message audio (pattern for later): users/{userId}/voice-profiles/{voiceProfileId}/messages/{messageId}/audio.mp3 */
export function messageAudioObjectPath(
  userId: string,
  voiceProfileId: string,
  messageId: string,
  extension: string = "mp3"
): string {
  return `users/${userId}/voice-profiles/${voiceProfileId}/messages/${messageId}/audio.${extension}`;
}

/**
 * Step 6 pending-generation audio (ephemeral, pre-Save).
 * users/{userId}/pending/{generationId}.mp3
 *
 * Lives in the same essence-audio bucket as permanent message audio, under a
 * dedicated `pending/` prefix. On Save it is COPIED (not moved) to the
 * permanent messageAudioObjectPath, then the pending object is deleted — see
 * docs/session-8/Step6_OpenContracts.md Q5. NOTE: this keeps pending audio in
 * essence-audio rather than the contract's literal `messages` bucket, to avoid
 * provisioning a second storage bucket; the copy-then-delete promotion is
 * unchanged.
 */
export function pendingGenerationAudioPath(
  userId: string,
  generationId: string,
  extension: string = "mp3"
): string {
  return `users/${userId}/pending/${generationId}.${extension}`;
}
