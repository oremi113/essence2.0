/**
 * View-state machine for A6 — Preview & Refine (Deferred-Audio variant).
 *
 * Mirrors the prototype controller's deferred model (essence-step6-a6-
 * deferred.html). Models only the DISCRETE logical state: candidate vs
 * committed, the two budgets, the in-flight round-trip, and the commit-
 * failure beat. The scrubber position is high-frequency and stays in the
 * component (refs + interval), not here.
 *
 * Cap states are DERIVED (see selectors at the bottom), never stored — a
 * cap is purely a function of the live counts, so storing it would invite
 * drift.
 */

import type { CommittedTake } from './PreviewRefineScreen.types';

/** Hard cap: paid voice renders per message. Dots = these. (A1 §A1.6) */
export const TOTAL_RECORDINGS = 3;
/** Soft cap: free "See another way" text re-rolls per message. */
export const TOTAL_REROLLS = 10;

export type PreviewMode = 'committed' | 'candidate';

export interface PreviewState {
  mode: PreviewMode;
  /** The take you last HEARD — what Save persists, what "Back to the take
   *  you heard" returns to. */
  committedText: string;
  committedDurationSec: number;
  /** The un-heard text draft on the card, or null in committed mode. */
  candidateText: string | null;
  recordingsRemaining: number;
  rerollsRemaining: number;
  reshapeExhausted: boolean;
  /** Per-user latch: once the tap-to-play gesture is learned the hint is gone. */
  playHintLearned: boolean;
  /**
   * A spendable round-trip is in flight. Disables the commit + free-draft
   * buttons (double-tap prevention) and drives the Working stone.
   */
  pending: 'freedraft' | 'commit' | null;
  /**
   * The last commit failed: the calm inline "nothing was spent" line shows
   * and the pending dot has refilled. Cleared on the next commit/free-draft
   * attempt or on Keep.
   */
  commitFail: boolean;
}

export type PreviewAction =
  | { type: 'FREE_DRAFT_START' }
  | { type: 'FREE_DRAFT_SUCCESS'; candidateText: string; rerollsRemaining: number }
  | { type: 'FREE_DRAFT_FAIL' }
  | { type: 'COMMIT_START' }
  | { type: 'COMMIT_SUCCESS'; recordingsRemaining: number; durationSec: number }
  | { type: 'COMMIT_FAIL' }
  | { type: 'KEEP' }
  | { type: 'PLAY_HINT_LEARNED' };

export interface PreviewInit {
  committed: CommittedTake;
  recordingsRemaining: number;
  rerollsRemaining: number;
  reshapeExhausted: boolean;
  playHintLearned: boolean;
  /**
   * A candidate already on screen at mount — the server rehydrate case (a
   * mid-candidate refresh, or returning from reshape). Opens the screen in
   * candidate mode against the committed take underneath. Null/absent =
   * first listen (committed).
   */
  initialCandidateText?: string | null;
}

export function initPreviewState(init: PreviewInit): PreviewState {
  const candidateText = init.initialCandidateText ?? null;
  return {
    mode: candidateText ? 'candidate' : 'committed',
    committedText: init.committed.text,
    committedDurationSec: init.committed.durationSec,
    candidateText,
    recordingsRemaining: clampCount(init.recordingsRemaining, TOTAL_RECORDINGS),
    rerollsRemaining: clampCount(init.rerollsRemaining, TOTAL_REROLLS),
    reshapeExhausted: init.reshapeExhausted,
    playHintLearned: init.playHintLearned,
    pending: null,
    commitFail: false,
  };
}

function clampCount(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.floor(n)));
}

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'FREE_DRAFT_START':
      // Guard: nothing to spend, or already busy.
      if (state.pending || state.rerollsRemaining <= 0) return state;
      return { ...state, pending: 'freedraft', commitFail: false };

    case 'FREE_DRAFT_SUCCESS':
      return {
        ...state,
        mode: 'candidate',
        candidateText: action.candidateText,
        rerollsRemaining: clampCount(action.rerollsRemaining, TOTAL_REROLLS),
        pending: null,
        commitFail: false,
      };

    case 'FREE_DRAFT_FAIL':
      // Draft unchanged; the user stays where they were and can retry.
      return { ...state, pending: null };

    case 'COMMIT_START':
      // Only commits a real candidate, with recordings left, when idle.
      if (state.pending || state.mode !== 'candidate' || state.recordingsRemaining <= 0) {
        return state;
      }
      return { ...state, pending: 'commit', commitFail: false };

    case 'COMMIT_SUCCESS':
      // Promote the candidate to the committed take; it slides into Playback
      // (decision #5 — no reveal beat; the component starts playback).
      return {
        ...state,
        mode: 'committed',
        committedText: state.candidateText ?? state.committedText,
        committedDurationSec: action.durationSec,
        candidateText: null,
        recordingsRemaining: clampCount(action.recordingsRemaining, TOTAL_RECORDINGS),
        pending: null,
        commitFail: false,
      };

    case 'COMMIT_FAIL':
      // §5.6 — failure-safe: nothing was spent (count unchanged → the dimmed
      // dot refills), the draft is preserved, the calm line shows.
      return { ...state, pending: null, commitFail: true };

    case 'KEEP':
      return {
        ...state,
        mode: 'committed',
        candidateText: null,
        commitFail: false,
      };

    case 'PLAY_HINT_LEARNED':
      if (state.playHintLearned) return state;
      return { ...state, playHintLearned: true };

    default:
      return state;
  }
}

// ─── Derived selectors (caps are never stored) ──────────────────────────

/** All recordings spent — commit is done, the free-draft button retires. */
export function isRecordingCap(state: PreviewState): boolean {
  return state.recordingsRemaining <= 0;
}

/** Exactly one re-roll left — the quiet "one more after this" whisper. */
export function isLastReroll(state: PreviewState): boolean {
  return state.rerollsRemaining === 1;
}

/** No re-rolls left — the free-draft path swaps for a note. */
export function isTextCap(state: PreviewState): boolean {
  return state.rerollsRemaining <= 0;
}
