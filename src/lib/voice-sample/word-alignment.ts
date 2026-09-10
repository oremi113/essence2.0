/**
 * Turn ElevenLabs character-level alignment into word onsets.
 *
 * Step 5's whole claim is that the words resolve *as they are spoken*. A
 * hand-timed cadence table cannot deliver that: it was measured against one
 * reading, and every cloned voice has its own rate. Scaling the table to the
 * audio's total length fixes when the line *ends* but leaves words up to 141ms
 * out inside it — measured against a real clone, mean error 54ms, against a
 * syllable of roughly 150-250ms.
 *
 * The vendor already knows the answer. `POST /v1/text-to-speech/{id}/with-timestamps`
 * returns the same synthesis plus per-character timings, for the same cost.
 *
 * Pure and dependency-free so it can be tested without a vendor call.
 */

/** The `alignment` block of a with-timestamps response. */
export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface WordAlignment {
  /** Onset of each word, in ms from the start of the audio. */
  offsetsMs: number[];
  /** Where the audio actually ends, in ms. */
  durationMs: number;
}

/**
 * Collapse per-character timings to per-word onsets.
 *
 * A word begins at the start time of its first non-space character. Splitting
 * on whitespace is what the screen does to render the spans, so the two must
 * agree — a mismatch in length is treated as unusable rather than silently
 * misaligning the reveal.
 *
 * Returns null when the alignment cannot be trusted: absent, ragged parallel
 * arrays, or a word count that disagrees with the line. The caller falls back
 * to the cadence table, which is wrong by a knowable amount rather than
 * arbitrarily.
 */
export function wordAlignmentFrom(
  alignment: CharacterAlignment | null | undefined,
  line: string
): WordAlignment | null {
  if (!alignment) return null;

  const { characters, character_start_times_seconds: starts } = alignment;
  const ends = alignment.character_end_times_seconds;

  if (
    !Array.isArray(characters) ||
    !Array.isArray(starts) ||
    !Array.isArray(ends) ||
    characters.length === 0 ||
    characters.length !== starts.length ||
    characters.length !== ends.length
  ) {
    return null;
  }

  const offsetsMs: number[] = [];
  let inWord = false;

  for (let i = 0; i < characters.length; i++) {
    const isSpace = /\s/.test(characters[i]);
    if (isSpace) {
      inWord = false;
      continue;
    }
    if (!inWord) {
      const s = starts[i];
      if (!Number.isFinite(s)) return null;
      offsetsMs.push(Math.round(s * 1000));
      inWord = true;
    }
  }

  // The screen splits the line the same way to build its spans. If these
  // disagree the reveal would light the wrong words, which is worse than
  // falling back.
  const expected = line.trim().split(/\s+/).filter(Boolean).length;
  if (offsetsMs.length !== expected) return null;

  const last = ends[ends.length - 1];
  if (!Number.isFinite(last)) return null;

  // Onsets must be non-decreasing; anything else means we misread the payload.
  for (let i = 1; i < offsetsMs.length; i++) {
    if (offsetsMs[i] < offsetsMs[i - 1]) return null;
  }

  return { offsetsMs, durationMs: Math.round(last * 1000) };
}
