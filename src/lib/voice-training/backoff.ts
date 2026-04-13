/**
 * Voice-profile creation retry policy. Single source of truth for the
 * backoff schedule and attempt cap so the GET status route and the
 * POST start route can never disagree.
 */

/** Maximum number of total creation attempts before we stop offering retry. */
export const VOICE_PROFILE_MAX_ATTEMPTS = 3;

/**
 * Backoff between successive attempts, indexed by attemptCount BEFORE
 * the next attempt. Index 0 = first try (no wait); index 1 = wait 5min
 * before second; index 2 = wait 30min before third; index 3+ clamps.
 */
export const VOICE_PROFILE_BACKOFF_MS = [
  0,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;

/**
 * Whether a new creation attempt is allowed given the prior history.
 * Pure function — caller passes attemptCount (post-increment from DB)
 * and the timestamp of the last attempt. Caller is also responsible
 * for the status check (only "failed" rows can retry); this helper
 * only enforces the cap + the wait window.
 */
export function isVoiceProfileRetryAllowed(
  attemptCount: number,
  lastAttemptAt: string | null
): boolean {
  if (attemptCount >= VOICE_PROFILE_MAX_ATTEMPTS) return false;
  if (!lastAttemptAt) return true;
  const wait =
    VOICE_PROFILE_BACKOFF_MS[
      Math.min(attemptCount, VOICE_PROFILE_BACKOFF_MS.length - 1)
    ];
  return Date.now() - new Date(lastAttemptAt).getTime() >= wait;
}
