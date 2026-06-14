/**
 * Props for C3 — Vault Limit Reached.
 *
 * The calmest of the three ceiling screens: a static, ongoing state, not a
 * moment. No variant data — the copy is fixed (the user has seen the C1
 * ceremony already, likely long ago). Both CTAs bubble out to the page,
 * which owns navigation. Telemetry (`step6.vault_limit_blocked`) fires in
 * the page client on surface, not here.
 */
export interface VaultLimitScreenProps {
  /** Primary CTA — "Visit your Memory Shelf" → the saved-messages shelf. */
  onVisitShelf: () => void;
  /** Secondary link — "See what's coming" → C2 Waitlist (interim: Home). */
  onSeeWhatsComing: () => void;
}
