/**
 * Is a failed vendor call OUR problem or a passing one?
 *
 * Until now every non-`ok` result from ElevenLabs was handled identically:
 * mark the profile failed, spend one of the user's three attempts, let them
 * retry. That is right for a timeout or a 502 — the next attempt genuinely can
 * succeed. It is wrong, and expensively so, for a failure rooted in the
 * operator's own account.
 *
 * 2026-09-22 is the worked example. The account hit its custom-voice ceiling,
 * so every clone failed with:
 *
 *     status 400, code "bad_request"
 *     "You have reached your maximum amount of custom voices (10 / 10)."
 *
 * A beta tester burned two of their three attempts on a wall no amount of
 * retrying could move, was shown "we'll have it ready soon" for a day, and the
 * only record of the real reason sat in a database column nobody reads. The
 * third attempt would have bricked the profile permanently.
 *
 * Two consequences follow from the distinction, and both are the caller's to
 * apply:
 *   - an `operator` failure must not consume the user's retry budget, and
 *   - it must not be dressed up as something waiting will fix.
 *
 * ── On matching the message text ──────────────────────────────────────────
 *
 * Matching prose from a vendor is normally a bad idea, and it is a deliberate
 * choice here rather than an oversight. ElevenLabs returned the generic code
 * `bad_request` for the capacity wall and put the entire signal in the
 * sentence. Structured codes are checked first and are preferred; the patterns
 * exist because the one failure that actually cost us had no structured code
 * to check.
 *
 * The failure mode of this design is a vendor rewording their message, which
 * degrades an `operator` verdict to `transient` — the behaviour we have today.
 * That is the safe direction to fail. The reverse (mistaking a passing blip for
 * an account problem) would strand a user who could simply have retried, so
 * every pattern below is written to be specific rather than generous.
 */

export type VendorFailureClass =
  /**
   * The operator's account, key, or plan is the blocker. The user did nothing
   * wrong and can do nothing about it. Retrying cannot succeed until a human
   * changes something.
   */
  | "operator"
  /**
   * A passing failure — timeout, upstream 5xx, network, vendor rate limit. The
   * next attempt may well succeed, which is what the retry budget is for.
   */
  | "transient";

export interface VendorFailure {
  /** HTTP status from the vendor call. */
  status: number;
  /** Structured vendor code, when one was given. */
  code?: string;
  /** Vendor message, already safe to inspect (never logged raw to a client). */
  message?: string;
}

/**
 * Structured vendor codes that name an account-level blocker outright.
 * Checked before the message patterns, because a code is a contract and prose
 * is not.
 */
const OPERATOR_CODES = new Set([
  "max_voice_limit_reached",
  "voice_limit_reached",
  "quota_exceeded",
  "invalid_api_key",
  "missing_permissions",
  "subscription_expired",
  "payment_required",
]);

/**
 * Message patterns for vendor failures that carry no usable code. Kept
 * narrow on purpose — see the note on matching message text above.
 */
const OPERATOR_MESSAGE_PATTERNS: RegExp[] = [
  /maximum amount of custom voices/i,
  /voice[_ ]?limit (reached|exceeded)/i,
  /upgrade your subscription/i,
  /exceeded your (character|quota) limit/i,
  /quota[_ ]exceeded/i,
  /invalid api key/i,
  /missing the permission/i,
];

/**
 * HTTP statuses that mean the account or key is the problem regardless of what
 * else came back.
 *
 * 429 is deliberately absent: from this vendor it means "too many requests
 * right now", which is exactly the passing failure a retry budget exists for.
 * A quota wall arrives as 400/401 with a message, not as a 429.
 */
const OPERATOR_STATUSES = new Set([401, 402, 403]);

export function classifyVendorFailure(failure: VendorFailure): VendorFailureClass {
  if (OPERATOR_STATUSES.has(failure.status)) return "operator";

  const code = failure.code?.trim().toLowerCase();
  if (code && OPERATOR_CODES.has(code)) return "operator";

  const message = failure.message ?? "";
  if (message && OPERATOR_MESSAGE_PATTERNS.some((p) => p.test(message))) return "operator";

  return "transient";
}

/**
 * The ledger action written when an `operator` failure is seen.
 *
 * Distinct from `voice_create` on purpose: it must not count toward the daily
 * voice-creation cap, and it needs to be greppable on its own so a daily check
 * can ask "did our account block anyone today?" without infrastructure we do
 * not have yet. This is the cheapest alerting that actually works — the whole
 * cost of the 2026-09-22 outage was that nothing anywhere said it was
 * happening.
 */
export const VOICE_CREATE_OPERATOR_BLOCK_ACTION = "voice_create_operator_block";
