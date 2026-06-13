/**
 * Types for A7 — Save Confirmation.
 *
 * The screen is pure and props-driven per CLAUDE.md: it owns the entrance
 * choreography and atmosphere, never touches Supabase, and both CTAs
 * bubble out through callback props — the page.tsx owns navigation.
 *
 * Variant contract (prototype header, locked):
 *   • `default` — message 1 or 2 of 3. Secondary CTA: "Create another,
 *     when you're ready" → message-creation entry.
 *   • `third`   — message 3 of 3. Same ceremonial close (A7 is the
 *     individual confirmation; it is NOT replaced by the ceiling moment),
 *     but the secondary CTA becomes "See what's coming" → C1 Three Shaped.
 */

export type SaveConfirmationVariant = 'default' | 'third';

export interface SaveConfirmationScreenProps {
  /** Recipient's display name — "Your voice is on the shelf for {name}." */
  recipientName: string;
  /**
   * Which secondary CTA the close shows. The page derives this from the
   * saved ordinal (3 of 3 → 'third').
   */
  variant: SaveConfirmationVariant;
  /**
   * Server `created_at` of the saved message (ISO 8601). Rendered as the
   * "Kept on {date} · {time}" attestation in the user's local timezone.
   */
  savedAtIso: string;
  /** Primary CTA — "View on Memory Shelf". */
  onViewShelf: () => void;
  /** Secondary CTA, `default` variant — "Create another, when you're ready". */
  onCreateAnother: () => void;
  /** Secondary CTA, `third` variant — "See what's coming" (→ C1). */
  onSeeWhatsComing: () => void;
}
