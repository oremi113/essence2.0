/**
 * Types for A4 — Personal Note.
 *
 * The screen is pure and props-driven per CLAUDE.md: it owns the
 * input/honoring stage state and all motion; the submit bubbles out
 * through one async callback (the page owns the /generate fetch and the
 * navigation that follows).
 *
 * Two entries share this screen:
 *   • Forward flow (A3 → A4): no `initialNote`; submit starts a fresh
 *     generation. (Not wired until A3 exists — MessageCreationFlow keeps
 *     its placeholder.)
 *   • Reshape return (A6 → A4): `initialNote` pre-fills the prior note;
 *     the page submits with `fromGenerationId` so the backend mints a
 *     fresh generation at edit_note_depth + 1 (API_CONTRACTS.md).
 */
import type { MessageCategory } from '@/lib/messageTemplates';

/**
 * Result of the submit round-trip (POST /api/messages/generate behind
 * it). Not-ok returns the screen from the honoring moment to the input
 * stage with the note intact — generation-failure UI proper is A5.b's
 * territory; this just avoids a dead end.
 */
export type PersonalNoteSubmitResult = { ok: true } | { ok: false };

export interface PersonalNoteScreenProps {
  /** Recipient's display name — crumb context ("FOR SARAH · …"). */
  recipientName: string;
  /** Category display label — crumb context ("… · ENCOURAGEMENT"). */
  categoryLabel: string;
  /**
   * Category key — selects the question copy. All seven strings are the
   * validation-task placeholder until that lands (single-table change in
   * PersonalNoteScreen.tsx).
   */
  category: MessageCategory;
  /** Reshape pre-fill (A6 "Reshape your note" path). Empty for the forward flow. */
  initialNote?: string;
  /**
   * Submit. `note` is the trimmed text, or null for the skip path ("Skip
   * and write it for me" — template default, no honoring moment). The
   * screen holds the honoring moment (note path) or a pending CTA (skip
   * path) until this resolves; on ok the parent navigates away.
   */
  onSubmit: (note: string | null) => Promise<PersonalNoteSubmitResult>;
  /** Backbar chevron. */
  onBack: () => void;
}
