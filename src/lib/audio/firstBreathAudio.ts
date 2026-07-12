'use client';

/**
 * Procedural First Breath ceremony audio — Web Audio, no asset files.
 *
 * The First Breath sequence spec'd three sound layers (FOLLOW_UPS #41):
 *   1. Ambient breath-room — soft pad + sub, seamless loop.
 *   2. Crystallize harmonic swell — ~2.8s one-shot on the crystallize beat.
 *   3. Reveal bell — resonant bell with a long tail, on the bloom + ring peak.
 *
 * Everything is synthesised live from oscillators + filters + a generated
 * reverb impulse — nothing sampled, downloaded, or licensed. The character is
 * fully described by a `FirstBreathAudioConfig`; four `PRESETS` walk from the
 * original low, filter-swept synth register ("spacey") toward progressively
 * lighter/airier voicings. Levels are relative gain, NOT metered LUFS — tune by
 * ear. Values stay well under 0 dBFS and under the ~-16 LUFS short-term ceiling
 * where iOS starts auto-ducking.
 *
 * iOS autoplay: a context created outside a gesture starts `suspended`. First
 * Breath auto-runs on mount with no gesture, so `start()` attempts an immediate
 * resume AND arms a one-time document gesture listener. One-shots that fire
 * while still suspended are dropped (not queued) so no stale bell lands late.
 *
 * Client-only. `createFirstBreathAudio()` returns null when Web Audio is
 * unavailable (SSR, or a browser without AudioContext) — callers no-op safely.
 */

// ─── Pitch helpers ──────────────────────────────────────────────────────────

/** Equal-tempered frequency for a MIDI note number (A4 = MIDI 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// MIDI notes used across the presets. The ceremony sits in Db.
const DB2 = 37; // 69.30 Hz
const DB3 = 49; // 138.59 Hz
const AB3 = 56; // 207.65 Hz
const DB4 = 61; // 277.18 Hz
const F4 = 65; // 349.23 Hz
const AB4 = 68; // 415.30 Hz
const DB5 = 73; // 554.37 Hz

// Sub-bass rolloff: highpass the whole mix just under Db2 so nothing below
// ~40 Hz reaches phone speakers (the spec's "sub rolloff < 40 Hz").
const MASTER_HIGHPASS_HZ = 38;

// Envelope timings (seconds). Ambient fade-out on exit rides the master fade in
// dispose() (DISPOSE_FADE_S), so there's no separate ambient-out constant.
const AMBIENT_FADE_IN_S = 2.5;
const SWELL_FADE_IN_S = 0.4;
const SWELL_SUSTAIN_S = 1.8;
const SWELL_FADE_OUT_S = 0.6;
const BELL_ATTACK_S = 0.012; // soft mallet — long enough to avoid a click
const DISPOSE_FADE_S = 0.6;

const EPSILON = 0.0001; // exponentialRamp cannot target 0

// ─── Config + presets ───────────────────────────────────────────────────────

export interface BellPartial {
  ratio: number;
  amp: number;
  decay: number;
}

export interface FirstBreathAudioConfig {
  /** Short human label for dev/audition surfaces. */
  label: string;
  /** One-line character description. */
  blurb: string;

  // Ambient pad
  padWave: OscillatorType; // sawtooth = synthy, triangle = softer, sine = pure
  padNotes: number[]; // MIDI notes voiced as detuned pairs
  padFilterHz: number; // lowpass cutoff — higher = airier
  padLfoDepthHz: number; // filter sweep depth — 0 removes the "spacey" movement
  padLfoRateHz: number;
  subLevel: number; // 0..1 sub-sine amount — 0 removes the low weight
  subNote: number; // MIDI note for the sub sine
  ambientLevel: number;

  // Crystallize swell
  swellRootNote: number;
  swellPartials: ReadonlyArray<{ ratio: number; amp: number }>;
  swellPeak: number;

  // Reveal bell
  bellNote: number;
  bellPartials: ReadonlyArray<BellPartial>;
  bellToneHz: number; // lowpass on the bell — higher = brighter
  bellLevel: number;
  reverbSeconds: number;
  reverbWet: number; // 0..1 relative wet-reverb level
}

// Reusable bell partial tables (inharmonic, struck-metal ratios).
const BELL_RESONANT: ReadonlyArray<BellPartial> = [
  { ratio: 0.56, amp: 0.55, decay: 4.5 }, // hum
  { ratio: 1.0, amp: 1.0, decay: 4.0 }, // prime
  { ratio: 1.19, amp: 0.5, decay: 2.6 }, // tierce
  { ratio: 1.5, amp: 0.42, decay: 2.0 }, // quint
  { ratio: 2.0, amp: 0.45, decay: 1.7 }, // nominal
  { ratio: 2.66, amp: 0.22, decay: 0.9 },
  { ratio: 3.01, amp: 0.18, decay: 0.8 },
  { ratio: 4.07, amp: 0.13, decay: 0.5 },
  { ratio: 5.43, amp: 0.09, decay: 0.35 },
];

const BELL_GLASS: ReadonlyArray<BellPartial> = [
  { ratio: 0.56, amp: 0.3, decay: 2.4 },
  { ratio: 1.0, amp: 0.95, decay: 2.8 },
  { ratio: 2.0, amp: 0.55, decay: 2.0 },
  { ratio: 3.0, amp: 0.4, decay: 1.3 },
  { ratio: 4.0, amp: 0.28, decay: 0.85 },
  { ratio: 5.4, amp: 0.18, decay: 0.55 },
  { ratio: 6.8, amp: 0.1, decay: 0.35 },
];

const BELL_CELESTE: ReadonlyArray<BellPartial> = [
  { ratio: 1.0, amp: 0.9, decay: 2.6 },
  { ratio: 2.0, amp: 0.5, decay: 2.0 },
  { ratio: 2.76, amp: 0.26, decay: 1.1 },
  { ratio: 4.0, amp: 0.18, decay: 0.7 },
  { ratio: 5.4, amp: 0.1, decay: 0.45 },
];

const BELL_CHIME: ReadonlyArray<BellPartial> = [
  { ratio: 1.0, amp: 0.85, decay: 2.0 },
  { ratio: 2.0, amp: 0.6, decay: 1.6 },
  { ratio: 3.0, amp: 0.42, decay: 1.1 },
  { ratio: 4.2, amp: 0.3, decay: 0.7 },
  { ratio: 5.4, amp: 0.2, decay: 0.5 },
  { ratio: 7.0, amp: 0.12, decay: 0.35 },
];

const SWELL_WARM: ReadonlyArray<{ ratio: number; amp: number }> = [
  { ratio: 1.0, amp: 0.9 },
  { ratio: 1.5, amp: 0.4 },
  { ratio: 2.0, amp: 0.5 },
  { ratio: 3.0, amp: 0.3 },
  { ratio: 4.0, amp: 0.2 },
  { ratio: 5.0, amp: 0.14 },
];

const SWELL_BRIGHT: ReadonlyArray<{ ratio: number; amp: number }> = [
  { ratio: 1.0, amp: 0.8 },
  { ratio: 2.0, amp: 0.5 },
  { ratio: 3.0, amp: 0.34 },
  { ratio: 4.0, amp: 0.24 },
  { ratio: 5.0, amp: 0.16 },
  { ratio: 6.0, amp: 0.1 },
];

export type PresetId = 'lifted' | 'glass' | 'air' | 'crystalline';

export const PRESETS: Record<PresetId, FirstBreathAudioConfig> = {
  // A — closest to the original, just lifted an octave with a thinner sub and a
  // gentler filter sweep. Keeps the current identity, less spacey.
  lifted: {
    label: 'A · Lifted',
    blurb: 'Original voicing, up an octave — thinner sub, calmer filter sweep.',
    padWave: 'sawtooth',
    padNotes: [DB3, AB3, DB4],
    padFilterHz: 1100,
    padLfoDepthHz: 110,
    padLfoRateHz: 0.06,
    subLevel: 0.22,
    subNote: DB2,
    ambientLevel: 0.09,
    swellRootNote: DB4,
    swellPartials: SWELL_WARM,
    swellPeak: 0.13,
    bellNote: DB3,
    bellPartials: BELL_RESONANT,
    bellToneHz: 3000,
    bellLevel: 0.12,
    reverbSeconds: 4.0,
    reverbWet: 0.9,
  },
  // B — triangle pad instead of saw kills the synth buzz; subtle sweep, small
  // sub. Reads warm and clean, like glass/vibraphone rather than a synth.
  glass: {
    label: 'B · Warm glass',
    blurb: 'Triangle pad (no saw buzz), subtle movement, brighter glassy bell.',
    padWave: 'triangle',
    padNotes: [DB3, AB3, DB4],
    padFilterHz: 1600,
    padLfoDepthHz: 45,
    padLfoRateHz: 0.05,
    subLevel: 0.12,
    subNote: DB2,
    ambientLevel: 0.085,
    swellRootNote: DB4,
    swellPartials: SWELL_BRIGHT,
    swellPeak: 0.12,
    bellNote: DB3,
    bellPartials: BELL_GLASS,
    bellToneHz: 4200,
    bellLevel: 0.12,
    reverbSeconds: 3.0,
    reverbWet: 0.7,
  },
  // C — pure sine pad, NO filter LFO (removes the spacey movement entirely),
  // barely-there sub. Soft, breathy, ambient; celeste-soft bell.
  air: {
    label: 'C · Soft air',
    blurb: 'Pure sine pad, no filter sweep at all — soft and breathy; celeste bell.',
    padWave: 'sine',
    padNotes: [DB3, AB3, DB4, F4],
    padFilterHz: 2400,
    padLfoDepthHz: 0,
    padLfoRateHz: 0.04,
    subLevel: 0.06,
    subNote: DB3,
    ambientLevel: 0.09,
    swellRootNote: DB4,
    swellPartials: SWELL_WARM,
    swellPeak: 0.11,
    bellNote: DB3,
    bellPartials: BELL_CELESTE,
    bellToneHz: 3500,
    bellLevel: 0.11,
    reverbSeconds: 3.5,
    reverbWet: 0.8,
  },
  // D — highest/lightest: sine pad up another octave, no sub weight, delicate
  // glass-chime bell. Ethereal, most "un-synthy" of the four.
  crystalline: {
    label: 'D · Crystalline',
    blurb: 'Highest, most ethereal — no low weight, delicate glass-chime bell.',
    padWave: 'sine',
    padNotes: [DB4, AB4, DB5],
    padFilterHz: 3200,
    padLfoDepthHz: 0,
    padLfoRateHz: 0.04,
    subLevel: 0.05,
    subNote: DB3,
    ambientLevel: 0.085,
    swellRootNote: DB5,
    swellPartials: SWELL_BRIGHT,
    swellPeak: 0.1,
    bellNote: DB4,
    bellPartials: BELL_CHIME,
    bellToneHz: 5200,
    bellLevel: 0.11,
    reverbSeconds: 2.5,
    reverbWet: 0.9,
  },
};

/** The voicing the production ceremony uses. Owner-chosen: warm glass — warm,
 *  mid-forward, no synth buzz; carries on phone speakers and to older ears
 *  (the 45–70 audience) far better than the brighter/airier options. */
export const DEFAULT_PRESET_ID: PresetId = 'glass';

// ─── Public interface ───────────────────────────────────────────────────────

export interface FirstBreathAudioEngine {
  /**
   * Attempt to start the ambient bed. Safe to call before any gesture: if the
   * context can't run yet (iOS), a one-time document gesture listener unlocks
   * it on the first interaction. Idempotent.
   */
  start(): void;
  /** Fire the crystallize harmonic swell one-shot. No-op if not yet unlocked. */
  playCrystallize(): void;
  /** Fire the reveal bell one-shot. No-op if not yet unlocked. */
  playReveal(): void;
  /** Fade everything out and release the context. Idempotent. */
  dispose(): void;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Build a First Breath audio engine, or null when Web Audio is unavailable
 * (server render, or a browser without AudioContext). The caller treats null as
 * "silent ceremony" and every method call becomes a safe no-op via `?.`.
 */
export function createFirstBreathAudio(
  config: FirstBreathAudioConfig = PRESETS[DEFAULT_PRESET_ID]
): FirstBreathAudioEngine | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();

  // sources → masterGain → highpass(38Hz) → destination
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = MASTER_HIGHPASS_HZ;
  masterGain.connect(highpass);
  highpass.connect(ctx.destination);

  // Long, smooth reverb tail (generated impulse — decaying noise) with a wet
  // level the config controls.
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulseResponse(ctx, config.reverbSeconds, 3.2);
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = config.reverbWet;
  reverb.connect(reverbWet);
  reverbWet.connect(masterGain);

  // Track every oscillator so dispose() can stop the graph cleanly.
  const oscillators: OscillatorNode[] = [];
  const now = () => ctx.currentTime;

  let disposed = false;
  let ambientStarted = false;
  let ambientGain: GainNode | null = null;

  // ─── Ambient bed ──────────────────────────────────────────────────────────
  function buildAmbient() {
    const gain = ctx.createGain();
    gain.gain.value = 0; // faded in on unlock
    gain.connect(masterGain);
    ambientGain = gain;

    // Sub sine at the root (optional — subLevel 0 skips it).
    if (config.subLevel > 0) {
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = midiToFreq(config.subNote);
      const subGain = ctx.createGain();
      subGain.gain.value = config.subLevel;
      sub.connect(subGain).connect(gain);
      oscillators.push(sub);
    }

    // Pad: detuned voice pairs through a lowpass for a soft, breathing chord.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = config.padFilterHz;
    padFilter.Q.value = 0.7;
    padFilter.connect(gain);

    for (const note of config.padNotes) {
      const freq = midiToFreq(note);
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = config.padWave;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const voiceGain = ctx.createGain();
        voiceGain.gain.value = 0.16;
        osc.connect(voiceGain).connect(padFilter);
        oscillators.push(osc);
      }
    }

    // Slow filter LFO — the pad "breathes". Depth 0 removes the sweep entirely
    // (the main lever away from the sci-fi character).
    if (config.padLfoDepthHz > 0) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = config.padLfoRateHz;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = config.padLfoDepthHz;
      lfo.connect(lfoGain).connect(padFilter.frequency);
      oscillators.push(lfo);
    }

    for (const osc of oscillators) {
      try {
        osc.start();
      } catch {
        // already started — ignore
      }
    }
  }

  function fadeAmbientIn() {
    if (!ambientGain || ambientStarted) return;
    ambientStarted = true;
    const g = ambientGain.gain;
    const t = now();
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, EPSILON), t);
    g.linearRampToValueAtTime(config.ambientLevel, t + AMBIENT_FADE_IN_S);
  }

  // ─── iOS unlock ───────────────────────────────────────────────────────────
  const GESTURE_EVENTS: Array<keyof DocumentEventMap> = [
    'pointerdown',
    'touchstart',
    'keydown',
  ];

  function removeGestureListeners() {
    for (const evt of GESTURE_EVENTS) {
      document.removeEventListener(evt, onGesture);
    }
  }

  function onGesture() {
    void ctx.resume().then(() => {
      if (disposed) return;
      fadeAmbientIn();
    });
    removeGestureListeners();
  }

  function armGestureUnlock() {
    for (const evt of GESTURE_EVENTS) {
      document.addEventListener(evt, onGesture, { once: false, passive: true });
    }
  }

  // ─── One-shot: crystallize swell ──────────────────────────────────────────
  function playCrystallize() {
    if (disposed || ctx.state !== 'running') return;
    const t = now();
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(masterGain);

    const root = midiToFreq(config.swellRootNote);
    const partialOscs: OscillatorNode[] = [];
    for (const { ratio, amp } of config.swellPartials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = root * ratio;
      // A whisper of upward detune drift — "becoming" rather than static.
      osc.detune.setValueAtTime(0, t);
      osc.detune.linearRampToValueAtTime(6, t + SWELL_FADE_IN_S + SWELL_SUSTAIN_S);
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(bus);
      osc.start(t);
      partialOscs.push(osc);
    }

    const total = SWELL_FADE_IN_S + SWELL_SUSTAIN_S + SWELL_FADE_OUT_S;
    const g = bus.gain;
    g.setValueAtTime(EPSILON, t);
    g.linearRampToValueAtTime(config.swellPeak, t + SWELL_FADE_IN_S);
    g.setValueAtTime(config.swellPeak, t + SWELL_FADE_IN_S + SWELL_SUSTAIN_S);
    g.exponentialRampToValueAtTime(EPSILON, t + total);

    const stopAt = t + total + 0.05;
    for (const osc of partialOscs) {
      osc.stop(stopAt);
      osc.onended = () => {
        osc.disconnect();
        bus.disconnect();
      };
    }
  }

  // ─── One-shot: reveal bell ────────────────────────────────────────────────
  function playReveal() {
    if (disposed || ctx.state !== 'running') return;
    const t = now();

    // Bell bus → gentle lowpass (keeps it musical, not harsh) → dry + reverb.
    const bus = ctx.createGain();
    bus.gain.value = config.bellLevel;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = config.bellToneHz;
    tone.Q.value = 0.5;
    bus.connect(tone);
    tone.connect(masterGain); // dry
    tone.connect(reverb); // wet (long tail)

    const fundamental = midiToFreq(config.bellNote);
    const partialOscs: OscillatorNode[] = [];
    let maxDecay = 0;
    for (const { ratio, amp, decay } of config.bellPartials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = fundamental * ratio;
      const g = ctx.createGain();
      // Soft mallet attack, then exponential ring-down over the partial's decay.
      g.gain.setValueAtTime(EPSILON, t);
      g.gain.linearRampToValueAtTime(amp, t + BELL_ATTACK_S);
      g.gain.exponentialRampToValueAtTime(EPSILON, t + BELL_ATTACK_S + decay);
      osc.connect(g).connect(bus);
      osc.start(t);
      partialOscs.push(osc);
      maxDecay = Math.max(maxDecay, decay);
    }

    const stopAt = t + BELL_ATTACK_S + maxDecay + 0.1;
    for (const osc of partialOscs) {
      osc.stop(stopAt);
    }
    partialOscs[partialOscs.length - 1].onended = () => {
      for (const osc of partialOscs) osc.disconnect();
      bus.disconnect();
      tone.disconnect();
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  function start() {
    if (disposed || ambientGain) return; // idempotent
    buildAmbient();
    void ctx.resume().then(() => {
      if (disposed) return;
      if (ctx.state === 'running') {
        fadeAmbientIn();
        removeGestureListeners();
      }
    });
    // In case resume() above was a no-op (iOS pre-gesture), unlock on first tap.
    if (ctx.state !== 'running') armGestureUnlock();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    removeGestureListeners();
    const t = now();
    const g = masterGain.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, EPSILON), t);
      g.exponentialRampToValueAtTime(EPSILON, t + DISPOSE_FADE_S);
    } catch {
      // ramp scheduling can throw if the context is already closing — ignore
    }
    window.setTimeout(() => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // already stopped — ignore
        }
      }
      void ctx.close().catch(() => {});
    }, DISPOSE_FADE_S * 1000 + 100);
  }

  return { start, playCrystallize, playReveal, dispose };
}

/**
 * Generate a stereo reverb impulse response: white noise shaped by an
 * exponential decay. `decay` controls tail steepness (higher = shorter, denser).
 */
function makeImpulseResponse(
  ctx: BaseAudioContext,
  seconds: number,
  decay: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const envelope = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return buffer;
}
