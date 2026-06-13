/**
 * Estimated spoken duration for a message text, in whole seconds.
 *
 * Nothing in the pipeline measures real audio duration yet —
 * `pending_generations` has no duration column and the TTS call doesn't
 * report one (FOLLOW_UPS #37). A6's scrubber treats its visual clock as
 * the source of truth and only needs a plausible end-time before the
 * clip loads (it adopts the real duration from the audio element's
 * metadata once available), so a words-per-minute estimate is enough.
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
