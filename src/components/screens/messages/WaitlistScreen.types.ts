/**
 * Types + content registry for C2 — Waitlist ("What we're building next").
 *
 * The five V2 features are content, not data — they live here as one source
 * of truth (the screen renders them; the page reports the picks in
 * `step6.waitlist_joined.features_selected`). Values match the prototype's
 * `data-feature` / checkbox `value` attributes exactly.
 */

export interface WaitlistFeature {
  /** Stable telemetry key — never reword (the label can change freely). */
  value: string;
  label: string;
  helper: string;
}

export const WAITLIST_FEATURES: readonly WaitlistFeature[] = [
  {
    value: 'more-messages',
    label: 'More messages each month',
    helper: 'Keep creating beyond the three you’ve shaped',
  },
  {
    value: 'scheduling',
    label: 'Schedule messages for future dates',
    helper: 'Arriving on birthdays, anniversaries, the moments you choose',
  },
  {
    value: 'reminders',
    label: 'Birthday and occasion reminders',
    helper: 'Gentle prompts so no moment slips past',
  },
  {
    value: 'multi-profile',
    label: 'Multiple voice profiles',
    helper: 'Preserve parents, partners, others you love',
  },
  {
    value: 'longer-messages',
    label: 'Longer, story-form messages',
    helper: 'Room for the memories that take a while to tell',
  },
] as const;

/** What the screen hands back to the page on a submit attempt. */
export interface WaitlistSubmission {
  email: string;
  /** Feature `value`s the user selected, in registry order. */
  features: string[];
}

export interface WaitlistScreenProps {
  /** Pre-filled, editable — the auth email (prototype: "confirmable"). */
  defaultEmail: string;
  /**
   * Effectful submit (page owns it: POST + telemetry). Resolves `true` on a
   * durable join (including the idempotent already-joined case) → the screen
   * flips to its success state; `false` → the screen shows a retry.
   */
  onSubmit: (submission: WaitlistSubmission) => Promise<boolean>;
  /** "Back to Home" — both the form and success footers. */
  onBackHome: () => void;
}
