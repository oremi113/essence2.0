/**
 * Validate an attacker-controlled redirect destination before following it.
 *
 * Both `?next=` (post-auth) and `returnPath` (Stripe portal return_url) arrive
 * in values anyone can craft. Following one unchecked hands an attacker a link
 * that looks like ours, authenticates or bills the victim for real, and *then*
 * lands them somewhere the attacker controls — the most convincing phishing
 * shape available, because every step before the last one was genuine.
 *
 * `startsWith("/")` is NOT sufficient, and neither is `startsWith("/") &&
 * !startsWith("//")`. These are the two traps this function exists to close:
 *
 *   "//evil.com"   starts with a slash; browsers resolve it as https://evil.com
 *   "/\evil.com"   passes a `!startsWith("//")` check; browsers normalise the
 *                  backslash to "/" and resolve it as //evil.com anyway
 *
 * Accepts only a site-relative path: exactly one leading slash, with neither a
 * slash nor a backslash behind it, and no percent-encoded equivalent (%2f,
 * %5c) that a downstream decode could turn back into one.
 *
 * Deliberately string-based rather than `new URL()` origin comparison: this
 * runs in server routes and in a client component rendered during SSR, where
 * there is no reliable ambient origin to compare against. The string rules are
 * total and need no context.
 *
 * Consolidated from four call sites that had drifted to four different levels
 * of rigour — two with no check at all, one with `startsWith("/")`, one with
 * `startsWith("/") && !startsWith("//")`. A single helper is what stops them
 * drifting apart again.
 */
export const DEFAULT_NEXT = "/home";

export function safeNextPath(raw: unknown, fallback: string = DEFAULT_NEXT): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;

  const rest = raw.slice(1);
  // A second slash or backslash — literal or encoded — means another origin.
  if (/^[/\\]/.test(rest)) return fallback;
  if (/^%2f/i.test(rest) || /^%5c/i.test(rest)) return fallback;

  return raw;
}
