/**
 * Types for A6 — Preview & Refine (Deferred-Audio variant).
 *
 * The screen is pure and props-driven per CLAUDE.md: it owns the
 * candidate/committed VIEW state (see PreviewRefineScreen.reducer.ts) and
 * all motion, but it never touches Supabase. Every server action bubbles
 * out through an async callback prop; the page.tsx owns the fetch and the
 * navigation.
 *
 * The deferred model (Amendment A1, locked — see
 * docs/session-8/Step6_OpenContracts.md):
 *   • Text drafts are free to explore (10 soft re-rolls).
 *   • A voice recording is the thing you commit to (3 hard recordings).
 *   • Dots on the commit button = recordings remaining.
 *   • Save keeps the last take you HEARD; an un-heard draft is dropped.
 */

/** A committed (recorded, hearable) take — the thing Save persists. */
export interface CommittedTake {
  /** Full message text, shown in the open transcript. */
  text: string;
  /**
   * Total audio duration in whole seconds, for the scrubber label. The
   * pending-audio playback URL is fetched lazily on first play via
   * `onRequestPlayback`; the duration is known up front from the
   * generation row so the scrubber can paint its end-time before audio
   * loads.
   */
  durationSec: number;
}

/**
 * Result of "See another way to say it" — POST /api/messages/regenerate
 * (variant mode, deferred). Returns a free TEXT candidate, no audio.
 */
export type FreeDraftResult =
  | { ok: true; candidateText: string; rerollsRemaining: number }
  | { ok: false; retryable: boolean };

/**
 * Result of "Hear this in your voice" — POST /api/messages/commit. Records
 * the candidate and promotes it. Failure-safe (A1 §5.6): a failed render
 * leaves the prior committed take intact and spends NO recording, so the
 * dot that dimmed in flight refills.
 */
export type CommitResult =
  | { ok: true; recordingsRemaining: number; durationSec: number }
  | { ok: false; retryable: boolean };

/** Result of Save — POST /api/messages/save. */
export type SaveResult =
  | { ok: true; messageId: string }
  | { ok: false; code: 'vault_limit_reached' | 'subscription_lapsed' | 'retryable' };

/**
 * Result of requesting playback audio for the committed take —
 * GET /api/messages/generations/:id/play (pending) or the saved route
 * once promoted. The screen drives a visual scrubber regardless; the URL
 * lets it actually play in production. In the dev sandbox this resolves
 * to a mock so the scrubber animates without real audio.
 */
export type PlaybackResult =
  | { ok: true; url: string }
  | { ok: false };

export interface PreviewRefineScreenProps {
  /**
   * The committed take in hand on arrival — the first listen, already
   * recorded (the magic moment is never deferred). Its transcript is the
   * "still safe underneath" take that "Back to the take you heard"
   * returns to.
   */
  committed: CommittedTake;

  /**
   * A candidate already on screen at mount — the rehydrate case (mid-
   * candidate refresh, or returning from reshape with a fresh draft). Opens
   * the screen in candidate mode. Absent/null = first listen (committed).
   */
  initialCandidateText?: string | null;

  /** Voice recordings remaining (0–3). Drives the dots on the commit button. */
  recordingsRemaining: number;
  /** Free text re-rolls remaining (0–10). Drives the soft text cap. */
  rerollsRemaining: number;
  /**
   * Whether the note has hit the edit-note depth cap (reshape exhausted).
   * Folds the "What it says" option out of the change sheet.
   */
  reshapeExhausted: boolean;
  /**
   * Whether the tap-to-play gesture has already been learned by this user
   * (a persisted per-USER profile flag, not per-message). When true the
   * "Tap to hear it" hint never renders. First arrival passes false.
   */
  playHintLearned: boolean;
  /**
   * First-ever arrival into A6 for this user — shows the one-line arrival
   * education ("Listen. If it's not quite right, you can change it.").
   * d1 only, first arrival only.
   */
  isFirstArrival: boolean;

  // ─── Server actions (the page owns the fetch) ───

  /** "See another way to say it" — free text re-roll. */
  onFreeDraft: () => Promise<FreeDraftResult>;
  /** "Hear this in your voice" — spend a recording, promote the candidate. */
  onCommit: () => Promise<CommitResult>;
  /** "Back to the take you heard" — clear the un-heard candidate server-side. */
  onKeepCurrent: () => Promise<void>;
  /** Save the committed take. Resolves with the new message id on success. */
  onSave: () => Promise<SaveResult>;
  /** Discard the whole in-flight message. */
  onDiscard: () => Promise<void>;
  /** "What it says" — route to A4 to change the note (returns as a candidate). */
  onReshape: () => void;
  /** Fetch a playback URL for the committed take (lazy, on first play). */
  onRequestPlayback: () => Promise<PlaybackResult>;
  /** Back chevron — exits A6 (typically to A4). */
  onBack: () => void;

  // ─── Optional side-effect hooks ───

  /** Fired once when the tap-to-play gesture is first learned, so the page
   *  can persist the per-user flag. */
  onPlayHintLearned?: () => void;
  /** Fired after a successful Save — typically navigates to A7. */
  onSaved?: (messageId: string) => void;
  /** Fired after a successful Discard — typically navigates Home. */
  onDiscarded?: () => void;
}
