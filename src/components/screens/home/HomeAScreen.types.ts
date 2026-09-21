/**
 * Home A — the props contract for the retrofit.
 *
 * Home A is `/home` before the voice profile is `ready`: the screen a user
 * lands on between finishing onboarding and hearing their voice. Its only job
 * is to get a paused person back into the booth, so its only verb is
 * *re-enter* — never record. See `docs/session-home-a/home-a-critique.md`.
 *
 * Pure and props-driven per CLAUDE.md: no Supabase, no redirect, no server
 * actions. The page owns the fetch and the §2.1 redirect table; the client
 * wrapper owns connectivity and the tap.
 */
import type { ReactNode } from 'react';

/**
 * The three registers. One adaptive composition, not three screens — the
 * register changes what the content and the pinned block hold, never the
 * shell (thread 2 §5.1).
 *
 * `processing` is deliberately absent: voice creation only runs after Card
 * Capture and has its own screen at `/app/voice/processing`, so `/home`
 * redirects that state away rather than rendering it.
 */
export type HomeARegister = 'not-started' | 'paused' | 'failed';

/**
 * `failed` is one register with three sub-states, branching on whether a retry
 * can actually run. The CTA is a lie in two of them, which is the whole reason
 * the split exists (`docs/session-home-a/owner-call-failed-register.md`).
 *
 * - `retryable`  — `/start` will run. Primary is "Try again".
 * - `waiting`    — inside the backoff window; `/start` answers 429. **No
 *                  primary at all**: a disabled button with a timer is still
 *                  the dead primary the rule forbids. The pinned block holds
 *                  when to come back instead.
 * - `exhausted`  — `attempt_count >= 3`, so retry is gone permanently. The
 *                  primary becomes a mailto, because at that point it *is* the
 *                  one committed action, not a fallback under a dead button.
 */
export type HomeAFailedSubState = 'retryable' | 'waiting' | 'exhausted';

/** Which past-due variant the banner slot holds, mirroring
 *  `VaultPastDueBanner`'s attempt-count variants. `null` = no past-due. */
export type HomeAPastDueVariant = 1 | 2 | 3 | null;

export interface HomeAScreenProps {
  /** Which register to render. */
  register: HomeARegister;
  /**
   * Training clips committed so far (`status='uploaded'`), 0..24 while
   * collecting. `failed` always implies 25 — creation requires payment and a
   * full script, so it is never a recording failure.
   */
  clipsRecorded: number;

  // ── failed only ──────────────────────────────────────────────────────────
  /** Which sub-state, when `register === 'failed'`. */
  failedSubState?: HomeAFailedSubState;
  /**
   * Length of the backoff window in ms, when `failedSubState === 'waiting'`.
   * The copy says which window this IS ("five minutes" / "half an hour"), not
   * how much of it is left — deriving it from the remaining time would make
   * the sentence shrink as the user watched it, and flip wording partway.
   */
  retryWindowMs?: number;
  /**
   * Epoch ms at which the backoff window closes, when `failedSubState ===
   * 'waiting'`. The screen flips itself to `retryable` at this moment, so the
   * button appears when the copy promised it would — a server render alone
   * would still be saying "try again in five minutes" at minute six.
   */
  retryAt?: number;

  // ── banner slot ──────────────────────────────────────────────────────────
  /**
   * ONE banner at a time. `offline` suppresses `pastDueVariant` for its
   * duration: `Update card` opens a Stripe portal session, which cannot
   * resolve offline, and a banner whose only action is dead is the rule
   * violating itself.
   */
  pastDueVariant?: HomeAPastDueVariant;
  /** Device is offline. Suppresses past-due and quiets the primary. */
  offline?: boolean;

  // ── the tap ──────────────────────────────────────────────────────────────
  /** Between tap and route change. Label swap only — no spinner: the motion
   *  guard makes a spinner wait, and one that waits then appears reads as a
   *  stall on a screen whose whole job is one tap. */
  pending?: boolean;

  // ── actions (the page/wrapper owns every side effect) ────────────────────
  /** Primary. Resumes at the exact prompt index, or retries the build.
   *  Not offered when it cannot run — see `cardBlocksRetry` and the
   *  offline handling in the screen. */
  onPrimary: () => void;
  /** `exhausted` only — opens `supportMailto()`. */
  onContactSupport?: () => void;
  /** Past-due banner's "Update card". */
  onUpdateCard?: () => void;
  /** Quiet top-right control. */
  onSettings: () => void;

  /** Test/dev override so `/dev/home-a` can preview the reduced-motion
   *  collapse without changing the OS setting. Every animation is gated on
   *  this as well as the media query — the query alone cannot be previewed,
   *  which is how three animations shipped still playing with the flag on. */
  reducedMotionOverride?: boolean;
  /** Past-due banner slot content, supplied by the page so the screen never
   *  imports the Stripe-aware wrapper. */
  banner?: ReactNode;
}

/** The 25-prompt script's three real stages (`src/lib/voice-training/script.ts`):
 *  1-5 Everyday, 6-17 Emotional, 18-25 Personal. Encoded as the script's own
 *  seams rather than an even split — the seams are content. Labels match
 *  `StageMap` in RecordScreen so Home A and the record flow cannot disagree
 *  about which stage a user is in. */
export const STAGES = [
  { label: 'Everyday', start: 0, end: 4, length: 5 },
  { label: 'Emotional', start: 5, end: 16, length: 12 },
  { label: 'Personal', start: 17, end: 24, length: 8 },
] as const;

/** Small-number words. The warm register spells these out — "You're twelve
 *  moments in" reads human where "12/25" reads like a scoreboard. Stops at
 *  twenty-four on purpose: 25 redirects away, so it can never render. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one',
  'twenty-two', 'twenty-three', 'twenty-four',
];

export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Per-stage fill fraction, 0..1. Equal thirds visually (see the band
 *  component); the honest count lives in the status pill and the labels. */
export function stageFractions(clipsRecorded: number): number[] {
  return STAGES.map((s) =>
    Math.max(0, Math.min(1, (clipsRecorded - s.start) / s.length)),
  );
}

/** Which stage index (0-2) is currently in progress — the one that takes the
 *  honey track. `-1` when nothing is started, so at 0 clips all three stay
 *  neutral and the boundary alone carries the map. */
export function currentStageIndex(clipsRecorded: number): number {
  if (clipsRecorded <= 0) return -1;
  return stageFractions(clipsRecorded).findIndex((f) => f < 1);
}

/**
 * The next-stop line: the single highest-value sentence on the screen, and
 * what makes the 12-prompt middle survivable. Points at the script's real
 * celebration beats (after prompts 1, 5, 12, 17, 25) rather than an invented
 * errand.
 *
 * Note the last branch says "the reading is done", not "you're finished":
 * payment sits between the last clip and the voice being built, so "finished"
 * promised something this screen cannot deliver.
 */
export function nextStopLine(clipsRecorded: number): string | null {
  const c = clipsRecorded;
  const w = (n: number) => capitalize(numberWord(n));
  if (c >= 1 && c <= 4) return `${w(5 - c)} more and Everyday is behind you.`;
  if (c >= 5 && c <= 11) return `${w(12 - c)} more brings you halfway.`;
  if (c >= 12 && c <= 16) return `${w(17 - c)} more and the longest stretch is done.`;
  if (c >= 17 && c <= 24) return `${w(25 - c)} more and the reading is done.`;
  return null;
}

/** The status pill — a condition, counted up, never a scoreboard. */
export function statusLine(clipsRecorded: number): string {
  return clipsRecorded === 1
    ? "You're one moment in."
    : `You're ${numberWord(clipsRecorded)} moments in.`;
}
