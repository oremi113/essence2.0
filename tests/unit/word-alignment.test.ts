import { describe, it, expect } from "vitest";
import { wordAlignmentFrom } from "@/lib/voice-sample/word-alignment";
import fixture from "../fixtures/elevenlabs-alignment.json";

/**
 * Coverage for the character→word collapse.
 *
 * The fixture is a REAL ElevenLabs `alignment` block, captured from a live
 * with-timestamps call for the §4.2 line. Shapes guessed from documentation are
 * how you ship a reveal that lights the wrong words.
 *
 * Every rejection path matters more than the happy path: a bad alignment that
 * is *used* misaligns the beat, while one that is *rejected* falls back to the
 * cadence table and is merely imprecise.
 */

const LINE = "If you're hearing this, I found a way to stay.";
const alignment = fixture.alignment;

describe("wordAlignmentFrom", () => {
  it("collapses real vendor alignment to one onset per word", () => {
    const result = wordAlignmentFrom(alignment, LINE);

    expect(result).not.toBeNull();
    expect(result!.offsetsMs).toHaveLength(10);
    // First word starts with the audio.
    expect(result!.offsetsMs[0]).toBe(0);
    expect(result!.durationMs).toBeGreaterThan(1500);
  });

  it("produces non-decreasing onsets inside the audio", () => {
    const { offsetsMs, durationMs } = wordAlignmentFrom(alignment, LINE)!;

    for (let i = 1; i < offsetsMs.length; i++) {
      expect(offsetsMs[i]).toBeGreaterThanOrEqual(offsetsMs[i - 1]);
    }
    expect(Math.max(...offsetsMs)).toBeLessThanOrEqual(durationMs);
  });

  it("rejects an alignment whose word count disagrees with the line", () => {
    // The screen splits the line to build its spans; a mismatch would light the
    // wrong words, which is worse than being imprecise.
    expect(wordAlignmentFrom(alignment, "Two words")).toBeNull();
  });

  it("rejects ragged parallel arrays", () => {
    expect(
      wordAlignmentFrom(
        { ...alignment, character_end_times_seconds: [0.1] },
        LINE
      )
    ).toBeNull();
  });

  it("rejects a non-finite timing rather than emitting NaN", () => {
    const starts = [...alignment.character_start_times_seconds];
    starts[0] = Number.NaN;
    expect(
      wordAlignmentFrom({ ...alignment, character_start_times_seconds: starts }, LINE)
    ).toBeNull();
  });

  it("returns null for missing or empty alignment", () => {
    expect(wordAlignmentFrom(null, LINE)).toBeNull();
    expect(wordAlignmentFrom(undefined, LINE)).toBeNull();
    expect(
      wordAlignmentFrom(
        { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] },
        LINE
      )
    ).toBeNull();
  });

  it("handles runs of whitespace without inventing empty words", () => {
    const result = wordAlignmentFrom(
      {
        characters: ["a", " ", " ", "b"],
        character_start_times_seconds: [0, 0.1, 0.2, 0.3],
        character_end_times_seconds: [0.1, 0.2, 0.3, 0.4],
      },
      "a  b"
    );
    expect(result!.offsetsMs).toEqual([0, 300]);
  });
});
