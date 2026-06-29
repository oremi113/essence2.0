/**
 * Estimated spoken duration for a message text, in whole seconds.
 *
 * This is a pre-load fallback, not the source of truth. The pipeline now
 * measures real audio duration: `pending_generations.audio_duration_ms`
 * is derived from the CBR mp3 byte length (`mp3-duration.ts`) and written
 * on a successful render (FOLLOW_UPS #37, resolved). A6's scrubber only
 * needs a plausible end-time before the clip loads — it adopts the real
 * duration from the audio element's metadata once available — so a
 * words-per-minute estimate is enough here.
 *
 * Rate: ~150 wpm (2.5 words/sec) — typical conversational TTS pace.
 * Safe on both server (page.tsx) and client (commit normalization).
 */
const WORDS_PER_SECOND = 2.5;
const MIN_SECONDS = 5;

export function estimateSpeechDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return MIN_SECONDS;
  return Math.max(MIN_SECONDS, Math.round(words / WORDS_PER_SECOND));
}
