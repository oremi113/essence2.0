/**
 * Props for C1 — Three Shaped.
 *
 * The one-time ceremonial moment after a user saves their 3rd (final) message.
 * Reached as a `?ceremony=three-shaped` overlay on the A7 saved route, not its
 * own route (Open Contracts lock). Inherits A7's amber atmosphere; the larger,
 * slower ceremony. Both CTAs bubble out to the page.
 */
export interface ThreeShapedScreenProps {
  /** Primary CTA — "See what's coming" → C2 Waitlist (attributed from=c1). */
  onSeeWhatsComing: () => void;
  /** Secondary link — "Back to Home". */
  onBackHome: () => void;
}
