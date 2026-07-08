/**
 * Support contact destination for the app's "contact-as-care" recovery paths
 * (Step 10 — e.g. the generation-failure ceiling after 3 attempts).
 *
 * ⚠️ PLACEHOLDER ADDRESS. `essence.example` is a reserved, unroutable TLD, so
 * this cannot receive mail — it is deliberately fake so it can never quietly
 * ship as a real-looking dead inbox. **Swap for the real monitored support
 * inbox before launch — FOLLOW_UPS #75 (launch-blocker).** A user reaching a
 * contact-as-care CTA is already having a bad moment; the address must land
 * somewhere a human reads.
 */
export const SUPPORT_EMAIL = 'support@essence.example';

/** Build a `mailto:` link with an optional prefilled subject. */
export function supportMailto(subject?: string): string {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${SUPPORT_EMAIL}${query}`;
}
