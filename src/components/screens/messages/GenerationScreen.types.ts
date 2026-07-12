/**
 * Types for A5 — Generation.
 *
 * A5 is the "shaping your message" wait that sits between A4 (note) and
 * A6 (preview) in the forward flow: the LLM call (and, in the control
 * arm, the ElevenLabs render) runs while this screen breathes. Latency
 * is real, so the screen earns its keep.
 *
 * Pure and props-driven per CLAUDE.md. The page owns the /generate call
 * and the navigation:
 *   • success → the page routes to the new generation's A6 (A5 unmounts);
 *     there is no in-screen "done" state, the screen just keeps breathing
 *     until the parent navigates away.
 *   • failure → the page flips `status` to "failed"; the screen surfaces
 *     a single warm retry (and, on the note path, an "Adjust your note"
 *     fallback). Both bubble out as callbacks.
 *
 * The screen owns only presentation: the working copy-beat progression
 * (Shaping → Listening → Almost there) and all motion. It holds no
 * generation state and never fetches.
 */

/**
 * Which stage the screen renders. The parent drives this off the
 * /generate round-trip — "working" while in flight, "failed" once it
 * resolves not-ok. (Success is modelled by unmount, not a third value.)
 */
export type GenerationStatus = 'working' | 'failed';

export interface GenerationScreenProps {
  /** Recipient's display name — crumb context ("FOR SARAH · …"). */
  recipientName: string;
  /** Category display label — crumb context ("… · ENCOURAGEMENT"). */
  categoryLabel: string;
  /** Working (in flight) or failed. Defaults to "working". */
  status?: GenerationStatus;
  /**
   * Did the user write a note? Failed state branches on it: the note
   * path keeps a "Your note is kept" reassurance + an "Adjust your note"
   * fallback link; the skip path shows the retry alone (there's no note
   * to adjust). Ignored while working.
   */
  hasNote?: boolean;
  /** Failed primary — "Try again" re-runs /generate. */
  onRetry: () => void;
  /**
   * Failed secondary — "Adjust your note" routes back to A4 with the
   * note pre-filled. Required-in-spirit on the note path; ignored on the
   * skip path (no secondary rendered).
   */
  onAdjustNote?: () => void;
  /**
   * After the spec's 3-attempt ceiling (MASTER_SPEC §12.4:2007 "after 3
   * attempts, offer alternative path"), the failed state stops looping on
   * "Try again" and offers **contact-as-care** instead: a warm support
   * reach-out as the primary, with "Try once more" kept as a quiet secondary
   * so it is never a hard dead end. Only takes effect when `onContactSupport`
   * is also provided; ignored while working.
   */
  retriesExhausted?: boolean;
  /**
   * Exhausted primary — opens the support contact (a `mailto:`). Page-owned
   * side effect, bubbled out per the three-layer rule (the screen never
   * knows the address). Required-in-spirit when `retriesExhausted` is true.
   */
  onContactSupport?: () => void;
}
