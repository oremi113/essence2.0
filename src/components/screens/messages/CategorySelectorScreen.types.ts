/**
 * Types for A3 — Category Selector.
 *
 * Production implementation of prototypes/message creation/
 * essence-step6-a3.html. Pure and props-driven per CLAUDE.md: the screen
 * owns the local selection state and all motion; the choice bubbles out
 * through one callback (the orchestrator stages it and advances to A4).
 *
 * Label, description, and display order are NOT props — the screen reads
 * them from the canonical registry (MESSAGE_CATEGORIES /
 * CATEGORY_DISPLAY_ORDER in src/lib/messageTemplates.ts), which was
 * reconciled to the prototype's copy + order on 2026-06-13 so there is a
 * single source of truth.
 */
import type { MessageCategory } from '@/lib/messageTemplates';

export interface CategorySelectorScreenProps {
  /** Recipient display name — the tappable context crumb ("For Sarah"). */
  recipientName: string;
  /**
   * The "last of three" variant (A3.b). When this is the third and final
   * Vault message, the screen earns warmth: warmer background tone, the
   * Position-2 ceiling note, and softer copy. Derived by the orchestrator
   * from saved_count_before === 2. Default false.
   */
  isFinalOfThree?: boolean;
  /**
   * Pre-selected category when the user returns to A3 (e.g. backs out of
   * A4). Null/undefined renders the default disabled-CTA state.
   */
  initialCategory?: MessageCategory | null;
  /**
   * The user tapped "Begin shaping" with a category chosen. The
   * orchestrator stages it and advances to A4. (No async round-trip —
   * pre-generation state is ephemeral client state per Q1.)
   */
  onSubmit: (category: MessageCategory) => void;
  /**
   * Backbar chevron and the context crumb both fire this — they return to
   * A2 (recipient). The orchestrator owns where "back" lands.
   */
  onBack: () => void;
}
