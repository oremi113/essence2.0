import { describe, expect, it } from 'vitest';
import {
  createFirstBreathAudio,
  midiToFreq,
} from '@/lib/audio/firstBreathAudio';

/**
 * Unit tests for the First Breath procedural audio engine (FOLLOW_UPS #41).
 *
 * The Web Audio graph itself can't be exercised under jsdom (no AudioContext),
 * so these cover the two things that are testable off the graph: the equal-
 * temperament pitch math the layers are tuned from, and the null-safe fallback
 * that keeps callers silent-but-safe when Web Audio is unavailable (SSR, or a
 * jsdom/no-AudioContext environment — the same path an unsupported browser hits).
 */
describe('midiToFreq', () => {
  it('anchors A4 (MIDI 69) at 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
  });

  it('computes the ceremony pitches used by the engine', () => {
    expect(midiToFreq(37)).toBeCloseTo(69.296, 2); // Db2 — bell fundamental
    expect(midiToFreq(44)).toBeCloseTo(103.826, 2); // Ab2 — fifth
    expect(midiToFreq(49)).toBeCloseTo(138.591, 2); // Db3 — swell root
  });

  it('doubles frequency per octave (12 semitones)', () => {
    expect(midiToFreq(49)).toBeCloseTo(midiToFreq(37) * 2, 6);
  });
});

describe('createFirstBreathAudio', () => {
  it('returns null when Web Audio is unavailable (jsdom has no AudioContext)', () => {
    expect(window.AudioContext).toBeUndefined();
    expect(createFirstBreathAudio()).toBeNull();
  });

  it('returns null (does NOT throw) when the AudioContext constructor throws', () => {
    // The browser caps concurrent AudioContexts (~6); once the cap is hit,
    // `new AudioContext()` throws. That throw must degrade to silence, never
    // propagate into the ceremony's mount effect and break the sacred beat.
    // (S10-C: silent graceful degradation.)
    class ThrowingAudioContext {
      constructor() {
        throw new DOMException('Failed to construct AudioContext', 'NotSupportedError');
      }
    }
    const original = window.AudioContext;
    // @ts-expect-error — installing a throwing stub for the test
    window.AudioContext = ThrowingAudioContext;
    try {
      expect(() => createFirstBreathAudio()).not.toThrow();
      expect(createFirstBreathAudio()).toBeNull();
    } finally {
      // Restore (was undefined under jsdom) so other tests see the real env.
      window.AudioContext = original;
    }
  });
});
