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
