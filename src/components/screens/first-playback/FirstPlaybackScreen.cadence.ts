/**
 * Step 5 · First Playback — beat offsets and the amplitude model.
 *
 * Ported from `prototypes/essence-step5-first-playback.html`, which is the
 * design source of truth. Every number here is the prototype's; none was
 * re-derived. Kept in a sidecar so the model is testable without mounting the
 * screen (the `useSequenceTimeline` / `RecordScreen.reducer` precedent).
 *
 * Two things live here:
 *   1. The beat offsets — when each element arrives.
 *   2. The cadence + envelope model — how loud the voice is at time `t`.
 *
 * In production the envelope comes from an `AnalyserNode`'s RMS, not from this
 * model (Chunk 3). This model exists because the prototype refuses to speak a
 * synthetic voice — "a fake voice would mislead the review" — so the dev page
 * and any preview surface drive the same choreography from the line's own
 * measured cadence. Every timing survives the swap unchanged.
 */

// ─── Beat offsets ───────────────────────────────────────────────────────────
// Offsets are relative to phase entry, except where noted as relative to PLAY.

/** Eyebrow "Your voice". */
export const EYEBROW_AT_MS = 400;
/** Lede line 1 — "Twenty-five moments." */
export const LEDE_1_AT_MS = 900;
/** Lede line 2 — "This is what they became." Names the investment before proof. */
export const LEDE_2_AT_MS = 1500;
/** Audio starts. The stone has been holding a beat of silence since PLAY-600. */
export const PLAY_AT_MS = 2900;
/** Breath stops on an exhale, 600ms before the voice — the silence before speech. */
export const BREATH_STOP_BEFORE_PLAY_MS = 600;
/** The line resolves out of blur just before it is spoken. */
export const LINE_VISIBLE_BEFORE_PLAY_MS = 400;

/** Hold the peak: 2.5s of nothing after the line ends, then "That's you." */
export const PAYOFF_AFTER_LINE_MS = 2500;
/** The aside, "It kept the pauses." */
export const ASIDE_AFTER_LINE_MS = 2900;
/** The CTA rises 8px over 1400ms. Nothing else moves. */
export const CTA_AFTER_LINE_MS = 4200;
/** "Hear it again" — 1.2s behind the CTA, so the committed action arrives alone. */
export const REPLAY_AFTER_LINE_MS = 5400;

/** A word eases to its resting colour this long after its own reveal. */
export const WORD_REST_MS = 600;
/** Luminance decays over this long once the line ends. */
export const LUM_DECAY_MS = 1600;

/**
 * Reduced motion compresses the approach — there is no motion to pace, and
 * holding someone in a still frame for 2.9s buys nothing. The tail is NOT
 * compressed: the payoff still lands after the line, because that pause is
 * comprehension time, not choreography.
 */
export const REDUCED = {
  eyebrowAtMs: 100,
  lede1AtMs: 200,
  lede2AtMs: 300,
  playAtMs: 900,
} as const;

// ─── Cadence ────────────────────────────────────────────────────────────────

/** One word and the offset, from line start, at which it is spoken. */
export interface WordBeat {
  word: string;
  atMs: number;
}

/**
 * Measured cadence for the canonical line (§4.2). Hand-timed against the real
 * utterance at 3.6s, so the word reveal lands with the voice rather than on a
 * synthetic grid.
 */
export const CANONICAL_LINE = "If you're hearing this, I found a way to stay.";
const CANONICAL_CADENCE_MS = [0, 210, 520, 980, 1620, 1870, 2240, 2380, 2690, 2880];

const MEASURED: Record<string, readonly number[]> = {
  [CANONICAL_LINE]: CANONICAL_CADENCE_MS,
};

/** How long a word is held, on the follower's own model. */
function wordDurationMs(word: string): number {
  return Math.max(190, word.length * 64);
}

/** Gap between word onsets when deriving a cadence. */
const WORD_GAP_MS = 70;

/**
 * Word beats for a line.
 *
 * The canonical line carries its measured cadence. Anything else derives
 * offsets on the same model the follower already assumes — which is what keeps
 * the layout from belonging to one sentence. Production replaces both paths
 * with real render-pipeline offsets.
 */
export function cadence(
  line: string,
  measured: Record<string, readonly number[]> = MEASURED
): WordBeat[] {
  const words = line.split(' ');
  const table = measured[line];

  if (table) {
    return words.map((word, i) => ({ word, atMs: table[i] ?? 0 }));
  }

  let t = 0;
  return words.map((word) => {
    const beat: WordBeat = { word, atMs: t };
    t += wordDurationMs(word) + WORD_GAP_MS;
    return beat;
  });
}

/**
 * When the utterance is over, in ms from line start. Computed from the last
 * word's own duration — never a literal, or the layout belongs to one sentence.
 */
export function lineEndMs(words: WordBeat[]): number {
  const last = words[words.length - 1];
  if (!last) return 0;
  return last.atMs + wordDurationMs(last.word) + 400;
}

/**
 * Target amplitude at time `t`, in 0..1.
 *
 * A syllable-articulation envelope: each word contributes a half-sine over its
 * own duration, weighted by length, and the loudest wins. Faded in over the
 * first 100ms and out over the last 300ms so the utterance neither cracks on
 * nor clips off.
 *
 * Replaced in production by `AnalyserNode` RMS. Same range, same consumer.
 */
export function targetAmplitude(
  tMs: number,
  words: WordBeat[],
  endMs: number
): number {
  if (tMs < 0 || tMs > endMs) return 0;

  let peak = 0;
  for (const { word, atMs } of words) {
    const duration = wordDurationMs(word);
    const delta = tMs - atMs;
    // The -40ms lead-in lets a word start lighting a frame before its onset,
    // which reads as anticipation rather than lag.
    if (delta > -40 && delta < duration) {
      const progress = Math.max(0, Math.min(1, (delta + 40) / (duration + 40)));
      const weight = 0.55 + 0.45 * Math.min(1, word.length / 6);
      peak = Math.max(peak, Math.sin(progress * Math.PI) * weight);
    }
  }

  const fadeOut = Math.min(1, (endMs - tMs) / 300);
  const fadeIn = Math.min(1, tMs / 100);
  return peak * fadeOut * fadeIn;
}

/**
 * Coarse per-word luminance step for reduced motion.
 *
 * Reduced motion restricts *movement*, not luminance — the stone is still lit
 * by the voice, it simply never scales. Quantised to 0.1 so the layers step
 * rather than glide.
 */
export function reducedLuminanceFor(word: string): number {
  return Math.round((0.3 + 0.5 * Math.min(1, word.length / 7)) * 10) / 10;
}

// ─── Follower coefficients ──────────────────────────────────────────────────
// Speech is not breath. The idle breath is a 5.5% scale at 3s, symmetric; if
// speech were also a scale pulse of similar magnitude, the most important state
// change in the beat would be invisible. Speech differs in *character*: it
// rises, articulates, and settles.

/** Fast follower → `--lum`. Syllable articulation. */
export const LUM_ATTACK = 0.35;
export const LUM_RELEASE = 0.1;
/** Slow follower → `--sus`. A sustained swell across the whole utterance. */
export const SUS_COEFFICIENT = 0.018;
/** How long the sustain takes to reach full. */
export const SUS_RAMP_MS = 900;

/** Longest frame delta the loop will integrate. */
export const MAX_FRAME_DELTA_MS = 50;
/** Assumed delta for the first frame, before there is a previous timestamp. */
export const FIRST_FRAME_DELTA_MS = 16;
