import type { RelationshipKey } from '@/lib/messageTemplates';

/**
 * A recipient the user has already saved a message to. Sourced from
 * public.recipients server-side. In V1 each user can have 1–3 of these
 * (lifetime cap on Vault tier).
 */
export interface ExistingRecipient {
  id: string;
  name: string;
  relationship: RelationshipKey;
  /**
   * Most recent message category for this recipient. Used only as the
   * duplicate-name disambiguator on A2.b — when two recipients share
   * both name AND relationship, this lets the user tell them apart.
   * Null when not needed.
   */
  lastMessageCategory?: string | null;
}

/**
 * The user's choice on A2. Two shapes:
 *
 * - `existing` — they picked one of the recipients in the list (A2.b).
 * - `new` — they typed a fresh name + relationship (A2.a or A2.c).
 *
 * The `new` variant is NOT promoted to a recipients row at A2 submit
 * per Step6_OpenContracts.md Q1 — the page layer carries it as
 * pending_recipient_name / pending_recipient_relationship /
 * pending_recipient_descriptor and only persists on Save.
 */
export type RecipientSelection =
  | { kind: 'existing'; recipientId: string }
  | {
      kind: 'new';
      name: string;
      relationship: RelationshipKey;
      /**
       * Free-form descriptor. Populated ONLY when relationship === 'other'
       * (the "Someone else" chip). Sharpens downstream generation by
       * giving Claude a relationship hint beyond the coarse 'other'
       * bucket. Optional even when relationship === 'other' — the user
       * is never required to fill it.
       */
      descriptor?: string;
    };

/**
 * Internal screen mode. The screen owns this and toggles between
 * `returning` and `addingNew` via the "+ Add someone new" button.
 * `firstEver` is derived from existingRecipients.length === 0.
 */
export type RecipientSetupMode = 'firstEver' | 'returning' | 'addingNew';

export interface RecipientSetupScreenProps {
  /**
   * Existing recipients to show on A2.b. Empty array = render A2.a (the
   * first-ever path with no list). The screen toggles to A2.c (Add new)
   * internally when the user taps "+ Add someone new" on A2.b.
   */
  existingRecipients: ExistingRecipient[];
  /** Called when the user taps Continue with a valid selection. */
  onSubmit: (selection: RecipientSelection) => void;
  /**
   * Called when the user taps the back chevron in the top-left.
   * Page-level concern — typically exits the flow back to Home.
   */
  onBack: () => void;
}
