/**
 * Support contact destination for the app's "contact-as-care" recovery paths
 * (Step 10 — e.g. the generation-failure ceiling after 3 attempts).
 *
 * Live, monitored inbox: `help@essencevault.app` is routed via Cloudflare
 * Email Routing to a real inbox and was delivery-verified before this swap
 * (FOLLOW_UPS #75, 2026-07-12). A user reaching a contact-as-care CTA is
 * already having a bad moment, so the address must land somewhere a human
 * reads — keep it that way. If mail routing ever changes, update this
 * constant; never point it at an unmonitored or unroutable address.
 */
export const SUPPORT_EMAIL = 'help@essencevault.app';

/** Build a `mailto:` link with an optional prefilled subject. */
export function supportMailto(subject?: string): string {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${SUPPORT_EMAIL}${query}`;
}
