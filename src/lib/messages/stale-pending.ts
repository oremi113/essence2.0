import "server-only";

/**
 * Abandoned-generation reclaim (Step 6).
 *
 * `/generate` allows one active `pending_generations` row per user
 * (`STEP6_LIMITS.maxActivePendingPerUser`). The cap assumes every row is either
 * finished by the user or superseded — but a row the user never came back to
 * stays active forever, and then blocks EVERY future flow with a 429. Nothing
 * in the product cleared one until `/messages/new` learned to.
 *
 * The clock read lives here rather than in the page so the page body stays a
 * pure data-shuttle (React's purity rule) and the threshold itself is testable.
 */

/**
 * How long an unfinished row is presumed to still be rendering. `/generate`
 * carries `maxDuration = 120` (LLM + TTS + upload), so anything meaningfully
 * past that has no request behind it any more. The margin covers a retried
 * cold start; it only needs to be safely longer than the ceiling, since the
 * cost of being late is one extra visit, and the cost of being early is
 * superseding a live render.
 */
export const STALE_PENDING_AFTER_MS = 5 * 60 * 1000;

/**
 * True when an unfinished pending row is old enough that no `/generate` call
 * can still be working on it — i.e. it is abandoned and safe to supersede.
 *
 * `nowMs` is injectable for tests; production callers use the default.
 */
export function isStalePending(createdAt: string, nowMs: number = Date.now()): boolean {
  const created = new Date(createdAt).getTime();
  // An unparseable timestamp is not evidence of abandonment — leave the row
  // alone rather than superseding a generation we can't reason about.
  if (Number.isNaN(created)) return false;
  return nowMs - created > STALE_PENDING_AFTER_MS;
}
