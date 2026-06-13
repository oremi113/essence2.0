// breathStoneEngine.ts
// Canvas-based cinematic breath stone engine
// Ported 1:1 from essence-breath-stone-cinematic.html reference prototype

export type BreathStoneState =
  | 'idle'
  | 'ready'
  | 'recording'
  | 'working'
  | 'celebrate'
  | 'playback'
  | 'shimmer'
  | 'guidance'
  | 'priming'
  | 'infused'
  | 'archive';

// ─── PERLIN NOISE ──────────────────────────────────────────────────────────
// Used for organic silhouette irregularity and breathing variance.
// DO NOT replace with Math.random() — randomness causes jitter.
// Perlin noise gives smooth, continuous, organic variation.

class PerlinNoise {
  // Gradients are cached by integer grid coordinates — bounded, deterministic,
  // and the actual source of determinism for noise output.
  private gradients: Record<string, { x: number; y: number }> = {};

  // NOTE: the reference prototype also memoized the interpolated result by
  // float (x, y) keys. That cache grew unboundedly because the draw loop
  // passes time-varying floats every frame — V8 eventually threw
  // "Too many properties to enumerate". Removed. Recomputation is cheap
  // (4 dot products + 3 interps) and the gradient cache preserves determinism.

  private randVect() {
    const theta = Math.random() * 2 * Math.PI;
    return { x: Math.cos(theta), y: Math.sin(theta) };
  }

  private dotProdGrid(x: number, y: number, vx: number, vy: number): number {
    const key = `${vx},${vy}`;
    const g = this.gradients[key] ?? (this.gradients[key] = this.randVect());
    return (x - vx) * g.x + (y - vy) * g.y;
  }

  private smootherstep(x: number): number {
    return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
  }

  private interp(x: number, a: number, b: number): number {
    return a + this.smootherstep(x) * (b - a);
  }

  get(x: number, y: number): number {
    const xf = Math.floor(x);
    const yf = Math.floor(y);
    return this.interp(
      y - yf,
      this.interp(x - xf, this.dotProdGrid(x, y, xf, yf), this.dotProdGrid(x, y, xf + 1, yf)),
      this.interp(x - xf, this.dotProdGrid(x, y, xf, yf + 1), this.dotProdGrid(x, y, xf + 1, yf + 1))
    );
  }
}

// ─── STATE PARAMETER DEFINITIONS ───────────────────────────────────────────
// Each state defines target values. The engine lerps toward these each frame.
// This produces smooth cinematic transitions between states.

interface StateParams {
  glowIntensity: number;     // HDR bloom opacity multiplier
  breathAmplitude: number;   // Scale change (0.04 = 4%, 0.25 = 25%)
  irregularity: number;      // Silhouette organic distortion amount
  colorTemp: number;         // 0 = cool mineral, 1 = warm amber
  backgroundBloom: number;   // Warm bloom radiates into background (recording only)
  spark: number;             // Prismatic highlight (ready state)
  innerPulse: number;        // Syllable-like rhythmic inner glow (playback)
  vignette: number;          // Edge darkening (playback focus)
  breathSpeed: number;       // Full cycle duration in ms
  voiceReactive: number;     // Simulated voice volume affects thickness
  sheen: number;             // Moving surface sheen (ready/shimmer state)
  peakHold: number;          // Fraction of breath cycle spent at peak (default 0.07, guidance 0.19)
  /** Sine amplitude of micro-tremble during peak hold. Optional; defaults to 0.
   *  The stone is a calm guardian — do not add tremor to new states unless
   *  explicitly requested. Field kept for per-state override capability. */
  peakTremor?: number;
  /** Fraction of cycle spent inhaling. Default 0.35 matches most states.
   *  Priming uses 0.5 so inhale and exhale are symmetric (3s up / 3s down).
   *  Optional to preserve backwards-compatibility with existing state defs. */
  inhaleRatio?: number;
  /** Multiplier on the global sinusoidal wobble that rides on top of the
   *  breath cycle. Default 1.0. Priming uses 0.15 so the motion reads as
   *  a clean, intentional breath cue rather than ambient stone life. */
  breathNoiseScale?: number;
}

const STATE_TARGETS: Record<BreathStoneState, StateParams> = {
  idle: {
    // Resting heartbeat — lightest, slowest, coolest
    glowIntensity: 0.06,
    breathAmplitude: 0.04,
    irregularity: 0.04,
    colorTemp: 0,
    backgroundBloom: 0,
    spark: 0,
    innerPulse: 0,
    vignette: 0,
    breathSpeed: 4500,
    voiceReactive: 0,
    sheen: 0,
    peakHold: 0.07,
  },
  ready: {
    // Awake / attentive — warm spark, subtle glow increase
    glowIntensity: 0.14,
    breathAmplitude: 0.06,
    irregularity: 0.05,
    colorTemp: 0.4,
    backgroundBloom: 0,
    spark: 1,
    innerPulse: 0.3,
    vignette: 0,
    breathSpeed: 4000,
    voiceReactive: 0,
    sheen: 0.8,
    peakHold: 0.07,
  },
  recording: {
    // Presence / moment happening — strongest amplitude, warm bloom
    glowIntensity: 0.40,
    breathAmplitude: 0.25,
    irregularity: 0.08,
    colorTemp: 1,
    backgroundBloom: 1,
    spark: 0,
    innerPulse: 0,
    vignette: 0,
    breathSpeed: 3500,
    voiceReactive: 1,
    sheen: 0,
    peakHold: 0.07,
  },
  working: {
    // Patient processing — slow + cool, but alive. Speed (not amplitude) is
    // what reads as "breathing" on a long wait: 4.8s is livelier than the
    // old near-static 6s while staying clearly slower than ready's 4s, so it
    // still reads "patient." Shared by A5 (generation) + RecordScreen
    // (session setup / voice shaping). [2026-06-12, A5 polish]
    glowIntensity: 0.04,
    breathAmplitude: 0.02,
    irregularity: 0.03,
    colorTemp: -0.2,
    backgroundBloom: 0,
    spark: 0,
    innerPulse: 0,
    vignette: 0,
    breathSpeed: 4800,
    voiceReactive: 0,
    sheen: 0,
    peakHold: 0.07,
  },
  celebrate: {
    // Single grand swell — longer, slower, bigger. Tremor disabled so the
    // spring physics don't fight the rapid target change.
    glowIntensity: 0.55,
    breathAmplitude: 0.35,
    irregularity: 0.06,
    colorTemp: 1,
    backgroundBloom: 1,
    spark: 1,
    innerPulse: 0,
    vignette: 0,
    breathSpeed: 1800,
    voiceReactive: 0,
    sheen: 1,
    peakHold: 0.07,
  },
  playback: {
    // Memory echo — rhythmic speech cadence, slight vignette
    glowIntensity: 0.12,
    breathAmplitude: 0.05,
    irregularity: 0.06,
    colorTemp: 0.3,
    backgroundBloom: 0,
    spark: 0,
    innerPulse: 1,
    vignette: 1,
    breathSpeed: 4000,
    voiceReactive: 0,
    sheen: 0,
    peakHold: 0.07,
  },
  shimmer: {
    // Ceremonial stillness — body barely moves, but two counter-rotating
    // sheens sweep across the surface and an ember-like glow oscillates.
    // glowIntensity is the midpoint; the draw loop overrides it per-frame
    // with a dynamic sine target (0.08–0.22) before lerping.
    glowIntensity: 0.15,
    breathAmplitude: 0.03,
    irregularity: 0.04,
    colorTemp: 0.2,
    backgroundBloom: 0,
    spark: 0.5,
    innerPulse: 0,
    vignette: 0,
    breathSpeed: 5000,
    voiceReactive: 0,
    sheen: 1.2,
    peakHold: 0.07,
  },
  guidance: {
    // Waiting / orienting — slower, deeper breath with a long peak hold
    // that communicates anticipation. Faint single-sine heartbeat inside
    // (distinct from playback's double-sine speech cadence).
    glowIntensity: 0.07,
    breathAmplitude: 0.035,
    irregularity: 0.04,
    colorTemp: 0.1,
    backgroundBloom: 0,
    spark: 0,
    innerPulse: 0.18,
    vignette: 0,
    breathSpeed: 6200,
    voiceReactive: 0,
    sheen: 0,
    peakHold: 0.19,
  },
  priming: {
    // "Take a breath" priming screen — the stone is a literal breathing
    // cue. Tuned to a clean, symmetric 3s inhale / 3s exhale (6s cycle),
    // with no peak hold so the motion is continuous rise-and-fall.
    // Amplitude is deliberately large and the ambient wobble is damped
    // so the breath reads as intentional, not ambient stone life.
    glowIntensity: 0.12,
    breathAmplitude: 0.22,    // ~22% expansion — unambiguously breathing
    irregularity: 0.02,       // clean silhouette keeps scale obvious
    colorTemp: 0.15,
    backgroundBloom: 0,
    spark: 0,
    innerPulse: 0,            // no heartbeat — breath is the whole show
    vignette: 0,
    breathSpeed: 6000,        // 6s cycle → 3s up / 3s down with inhaleRatio 0.5
    voiceReactive: 0,
    sheen: 0,
    peakHold: 0,              // no hold — continuous expand/contract
    inhaleRatio: 0.5,         // symmetric in/out
    breathNoiseScale: 0.15,   // near-silent ambient wobble
  },
  infused: {
    // Voice preserved — the stone has been transformed. Warm body tint
    // layer, ember-pulsing glow (0.20–0.45 over ~6s), concentric ripple
    // inside. glowIntensity is the midpoint; the draw loop overrides it
    // per-frame with the ember sine target before lerping.
    glowIntensity: 0.325,
    breathAmplitude: 0.10,
    irregularity: 0.06,
    colorTemp: 0.6,
    backgroundBloom: 0.4,
    spark: 0,
    innerPulse: 0.5,
    vignette: 0,
    breathSpeed: 5000,
    voiceReactive: 0,
    sheen: 0.3,
    peakHold: 0.07,
  },
  archive: {
    // Preserved, still — no animation
    glowIntensity: 0.02,
    breathAmplitude: 0,
    irregularity: 0.03,
    colorTemp: -0.1,
    backgroundBloom: 0,
    spark: 0,
    innerPulse: 0,
    vignette: 0,
    breathSpeed: 99999,
    voiceReactive: 0,
    sheen: 0,
    peakHold: 0.07,
  },
};

// ─── ENGINE CLASS ───────────────────────────────────────────────────────────

export interface SetStateOptions {
  /** Called once when a `celebrate` gesture completes. */
  onCelebrateEnd?: () => void;
  /** When true, snap to target with zero amplitude/irregularity, gate
   *  per-frame motion overlays, and halt the draw loop after one paint.
   *  Honors the user's `(prefers-reduced-motion: reduce)` preference. */
  reducedMotion?: boolean;
}

export class BreathStoneEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private noise = new PerlinNoise();
  private animationId: number | null = null;
  private currentState: BreathStoneState = 'idle';

  // Smoothed state variables (lerped toward targets each frame)
  private s: StateParams = { ...STATE_TARGETS.idle };

  // Breathing physics
  private breathVelocity = 0;
  private lastBreathTarget = 1;
  private isExhaleStart = false;

  // Celebrate tracking
  private celebrateStartTime: number | null = null;
  private onCelebrateEnd?: () => void;

  // Reduced-motion: freezes breath amplitude/irregularity to 0, gates
  // motion-driven overlays in the draw loop, and short-circuits the
  // animation loop to a single frame per state change.
  private reducedMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setState(state: BreathStoneState, options: SetStateOptions = {}) {
    const prev = this.currentState;
    const wasReducedMotion = this.reducedMotion;
    const nextReducedMotion = options.reducedMotion ?? false;

    this.currentState = state;
    this.reducedMotion = nextReducedMotion;

    if (state === 'celebrate') {
      this.celebrateStartTime = null;
      this.onCelebrateEnd = options.onCelebrateEnd;
    }
    // Kill accumulated spring momentum on a real state change. Without
    // this, switching to a state with much larger breathAmplitude (e.g.
    // idle → priming) causes the velocity integrator to overshoot on
    // first frame and the stone "bounces" before settling.
    if (prev !== state) {
      this.breathVelocity = 0;
    }

    if (nextReducedMotion) {
      // Engine invariant under reduced motion: amplitude and silhouette
      // irregularity are pinned at 0 — no breath, no organic wobble. The
      // stone holds the target state's resting glow / color temp / spark
      // values so "warm ready", "cool idle", "amber infused" still read.
      const target = STATE_TARGETS[state];
      this.s = { ...target, breathAmplitude: 0, irregularity: 0 };
      this.lastBreathTarget = 1;
      // Halt any running rAF; paint a single static frame.
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.draw(0);
      return;
    }

    // Exiting reduced-motion: resume the animation loop. Lerp re-engages
    // and chases the target smoothly from the static snapshot.
    if (wasReducedMotion && this.animationId === null) {
      this.start();
    }
  }

  start() {
    // No-op if already running or if reduced-motion has us in static mode.
    if (this.animationId !== null) return;
    if (this.reducedMotion) {
      this.draw(0);
      return;
    }
    this.animationId = requestAnimationFrame(this.draw);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
    // Resizing wipes the canvas. Under reduced motion the rAF loop is
    // halted, so nothing repaints unless we do it explicitly.
    if (this.reducedMotion) {
      this.draw(0);
    }
  }

  // ─── BREATHING PHYSICS ─────────────────────────────────────────────────
  // Asymmetric: 35% inhale / peakHold% peak hold / (65 - peakHold)% exhale
  // peakHold and peakTremor are per-state parameters so guidance can hold
  // longer and celebrate/guidance can disable the peak tremble.
  // Perlin variance ensures it never feels robotic.

  private getBreathScale(
    timestamp: number,
    amplitude: number,
    breathSpeed: number,
    peakHold: number,
    peakTremor: number,
    inhaleRatio: number,
    breathNoiseScale: number
  ): number {
    if (amplitude < 0.001) return 1;

    const cycleVariance = this.noise.get(timestamp * 0.00001, 0) * 0.02;
    const variedCycle = breathSpeed * (1 + cycleVariance);
    const phase = (timestamp % variedCycle) / variedCycle;

    // Inhale = first `inhaleRatio`, hold = next peakHold, exhale = remainder.
    // Default inhaleRatio of 0.35 preserves legacy asymmetric breathing
    // (used by idle/ready/recording/etc). Priming uses 0.5 for symmetric.
    const inhaleEnd = Math.min(0.95, Math.max(0.05, inhaleRatio));
    const holdEnd = Math.min(0.99, inhaleEnd + peakHold);
    const exhaleRange = Math.max(0.001, 1 - holdEnd);

    let breathCurve: number;
    let isPeakHold = false;

    if (phase < inhaleEnd) {
      breathCurve = phase / inhaleEnd;
    } else if (phase < holdEnd) {
      breathCurve = 1;
      isPeakHold = true;
    } else {
      breathCurve = 1 - (phase - holdEnd) / exhaleRange;
    }

    breathCurve = breathCurve * breathCurve * (3 - 2 * breathCurve);

    const tremor = isPeakHold ? Math.sin(timestamp * 0.018) * peakTremor : 0;
    const amplitudeVariance =
      this.noise.get(timestamp * 0.00008, 100) * 0.05 * breathNoiseScale;
    const variedAmplitude = amplitude * (1 + amplitudeVariance);
    const microVariance =
      (Math.sin(timestamp * 0.0003) * 0.10 +
        Math.sin(timestamp * 0.0007) * 0.05) *
      breathNoiseScale;

    const targetScale = 1 + breathCurve * variedAmplitude + microVariance + tremor;

    const accel = (targetScale - this.lastBreathTarget) * 0.025;
    this.breathVelocity += accel;
    this.breathVelocity *= 0.90;
    const scale = this.lastBreathTarget + this.breathVelocity;
    this.lastBreathTarget = scale;

    this.isExhaleStart = phase > holdEnd && phase < holdEnd + 0.03;

    return Math.max(0.90, Math.min(1.30, scale));
  }

  // ─── ORGANIC SILHOUETTE ────────────────────────────────────────────────
  // Perlin noise drives per-vertex radius variation.
  // The silhouette changes subtly over time — the stone is never the same shape twice.

  private generateSilhouette(
    baseRadius: number,
    segments: number,
    irregularity: number,
    timestamp: number
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const noiseScale = 0.15;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noiseVal = this.noise.get(
        Math.cos(angle) * noiseScale + timestamp * 0.0001,
        Math.sin(angle) * noiseScale + timestamp * 0.0001
      );
      const clusterNoise = this.noise.get(
        Math.cos(angle * 3) * 0.08,
        Math.sin(angle * 3) * 0.08
      );
      const irr = 1 + noiseVal * irregularity + clusterNoise * irregularity * 0.5;
      const r = baseRadius * irr;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
  }

  // ─── MAIN DRAW ─────────────────────────────────────────────────────────

  private draw = (timestamp: number) => {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.width / dpr;
    const H = this.canvas.height / dpr;
    const cx = W / 2;
    const cy = H / 2;
    const baseRadius = Math.min(W, H) * 0.28;

    ctx.clearRect(0, 0, W, H);

    // ── 1. LERP STATE VARIABLES ──────────────────────────────────────────
    let resolvedState = this.currentState;
    if (this.currentState === 'celebrate') {
      if (this.celebrateStartTime === null) this.celebrateStartTime = timestamp;
      // Grander window (2200ms) gives the slower breath target (1800ms) and
      // bigger amplitude (0.35) time to reach the lerped state.
      if (timestamp - this.celebrateStartTime > 2200) {
        this.currentState = 'idle';
        this.celebrateStartTime = null;
        this.onCelebrateEnd?.();
        resolvedState = 'idle';
      }
    }

    // Clone the static target so we can overlay dynamic per-frame overrides
    // (shimmer ember oscillation, infused ember pulse) before lerping.
    const target: StateParams = { ...STATE_TARGETS[resolvedState] };

    // Reduced-motion: freeze time-varying math to 0 so sine-driven
    // positions (sheen, spark) render at a deterministic phase and any
    // stray timestamp usage produces a stable frame.
    const motionTs = this.reducedMotion ? 0 : timestamp;

    if (!this.reducedMotion) {
      if (resolvedState === 'shimmer') {
        // Slow ceremonial oscillation — outer glow breathes 0.08 → 0.22 over
        // ~8s. This is what makes shimmer feel held-and-ceremonial rather
        // than frozen. Lerp chases smoothly on state entry/exit.
        target.glowIntensity = 0.15 + Math.sin(timestamp * 0.0008) * 0.07;
      } else if (resolvedState === 'infused') {
        // Ember pulse — glow cycles 0.20 → 0.45 over ~6s, same period as
        // the concentric ripple below so they breathe together.
        target.glowIntensity = 0.325 + Math.sin(timestamp * 0.00105) * 0.125;
      }
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Under reduced-motion `this.s` is snapped to target in `setState` and
    // the draw loop paints exactly one frame; skipping the lerp keeps the
    // snapshot clean and avoids re-introducing drift from a partially lerped
    // previous-state residue.
    if (!this.reducedMotion) {
      this.s.glowIntensity   = lerp(this.s.glowIntensity,   target.glowIntensity,   0.04);
      this.s.breathAmplitude = lerp(this.s.breathAmplitude, target.breathAmplitude, 0.03);
      this.s.irregularity    = lerp(this.s.irregularity,    target.irregularity,    0.03);
      this.s.colorTemp       = lerp(this.s.colorTemp,       target.colorTemp,       0.04);
      this.s.backgroundBloom = lerp(this.s.backgroundBloom, target.backgroundBloom, 0.03);
      this.s.spark           = lerp(this.s.spark,           target.spark,           0.05);
      this.s.innerPulse      = lerp(this.s.innerPulse,      target.innerPulse,      0.06);
      this.s.vignette        = lerp(this.s.vignette,        target.vignette,        0.04);
      this.s.breathSpeed     = lerp(this.s.breathSpeed,     target.breathSpeed,     0.02);
      this.s.voiceReactive   = lerp(this.s.voiceReactive,   target.voiceReactive,   0.04);
      this.s.sheen           = lerp(this.s.sheen,           target.sheen,           0.04);
      this.s.peakHold        = lerp(this.s.peakHold,        target.peakHold,        0.03);
      this.s.peakTremor      = lerp(this.s.peakTremor ?? 0, target.peakTremor ?? 0, 0.04);
    }

    // ── 2. BREATHING ────────────────────────────────────────────────────
    // Celebrate is a single gesture, not a breath cycle — it uses a
    // dedicated smoothstep rise/hold/fall curve that bypasses the
    // spring-damped cyclic physics entirely. Rationale:
    //   • Spring physics oscillate around rapidly-changing targets,
    //     which reads as shake at celebrate's large amplitude.
    //   • getBreathScale's 1.30 clamp hides real motion when the raw
    //     scale exceeds it (celebrate peak is 1.35), desyncing
    //     internal spring state from visible output.
    //   • microVariance and tremor add life to steady breaths but
    //     become visible shake on a fast one-shot gesture.
    // The dedicated curve below is deterministic, clamp-free, and
    // produces exactly one clean swell.
    let breathScale: number;
    if (this.currentState === 'celebrate' && this.celebrateStartTime !== null) {
      const elapsed = timestamp - this.celebrateStartTime;
      const duration = 2200;
      const t = Math.min(1, elapsed / duration);
      const celebrateAmplitude = STATE_TARGETS.celebrate.breathAmplitude;
      let curve: number;
      if (t < 0.3) {
        const r = t / 0.3;
        curve = r * r * (3 - 2 * r);          // smoothstep rise
      } else if (t < 0.6) {
        curve = 1;                            // peak hold
      } else {
        const r = (t - 0.6) / 0.4;
        curve = 1 - r * r * (3 - 2 * r);      // smoothstep fall
      }
      breathScale = 1 + curve * celebrateAmplitude;
      // Keep spring internal state aligned with visible scale so the
      // transition back to idle's cyclic physics is seamless.
      this.lastBreathTarget = breathScale;
      this.breathVelocity = 0;
      this.isExhaleStart = false;
    } else {
      breathScale = this.getBreathScale(
        timestamp,
        this.s.breathAmplitude,
        this.s.breathSpeed,
        this.s.peakHold,
        this.s.peakTremor ?? 0,
        this.s.inhaleRatio ?? 0.35,
        this.s.breathNoiseScale ?? 1.0
      );
    }
    const currentRadius = baseRadius * breathScale;

    // ── 3. VOICE-REACTIVE SILHOUETTE ────────────────────────────────────
    // No hard threshold — voiceReactive lerps smoothly 0→1 on state change
    // and serves as its own gate via the multiplier on `reactiveRadius`.
    // A `> 0.5` threshold used to live here, which caused a visible pop
    // ~200ms into the idle→recording transition when the lerp crossed it.
    const voiceVolume = this.reducedMotion
      ? 0
      : (Math.sin(timestamp * 0.003) * 0.5 + 0.5) * 0.15;
    const reactiveRadius = currentRadius * (1 + voiceVolume * this.s.voiceReactive);
    const silhouette = this.generateSilhouette(reactiveRadius, 72, this.s.irregularity, timestamp);

    // ── 4. ENVIRONMENT ───────────────────────────────────────────────────

    // Ambient warm gradient behind stone
    const ambientG = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
    ambientG.addColorStop(0, 'rgba(235, 224, 200, 0.02)');
    ambientG.addColorStop(0.5, 'rgba(251, 248, 244, 0.01)');
    ambientG.addColorStop(1, 'rgba(251, 248, 244, 0)');
    ctx.fillStyle = ambientG;
    ctx.fillRect(0, 0, W, H);

    // Directional light falloff — top-left source
    const dirG = ctx.createLinearGradient(0, 0, W, H);
    dirG.addColorStop(0, 'rgba(251, 248, 244, 0.005)');
    dirG.addColorStop(1, 'rgba(28, 26, 24, 0.012)');
    ctx.fillStyle = dirG;
    ctx.fillRect(0, 0, W, H);

    // Contact shadow — elliptical, anchors stone to surface
    ctx.save();
    ctx.translate(cx, cy + currentRadius * 0.85);
    ctx.scale(1, 0.3);
    const shadowG = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 0.9);
    shadowG.addColorStop(0, 'rgba(28, 26, 24, 0.08)');
    shadowG.addColorStop(0.5, 'rgba(28, 26, 24, 0.04)');
    shadowG.addColorStop(1, 'rgba(28, 26, 24, 0)');
    ctx.fillStyle = shadowG;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Playback vignette
    if (this.s.vignette > 0.01) {
      const vigG = ctx.createRadialGradient(
        cx, cy, currentRadius * 1.5,
        cx, cy, Math.max(W, H) * 0.7
      );
      vigG.addColorStop(0, 'rgba(28, 26, 24, 0)');
      vigG.addColorStop(1, `rgba(28, 26, 24, ${this.s.vignette * 0.08})`);
      ctx.fillStyle = vigG;
      ctx.fillRect(0, 0, W, H);
    }

    // Ambient particles — gated under reduced-motion so the single static
    // frame isn't punctuated by drifting specks that would otherwise never
    // animate (the loop halts, so a lone random placement would just look
    // like noise against the stone's otherwise still presence).
    if (!this.reducedMotion) {
      ctx.globalAlpha = 0.012;
      for (let i = 0; i < 25; i++) {
        const px = (this.noise.get(i * 0.2, timestamp * 0.00004) * 0.5 + 0.5) * W;
        const py = (this.noise.get(i * 0.2 + 100, timestamp * 0.00004) * 0.5 + 0.5) * H;
        ctx.fillStyle = '#E8DCC8';
        ctx.fillRect(px, py, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }

    // ── 5. STONE BODY ────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy);

    // Recording warm bloom radiates into background
    if (this.s.backgroundBloom > 0.01) {
      const bloomSize = Math.max(W, H) * 0.4;
      const bgBloom = ctx.createRadialGradient(0, 0, currentRadius, 0, 0, bloomSize);
      bgBloom.addColorStop(0, `rgba(235, 220, 200, ${this.s.backgroundBloom * 0.08})`);
      bgBloom.addColorStop(0.4, `rgba(232, 220, 200, ${this.s.backgroundBloom * 0.04})`);
      bgBloom.addColorStop(0.7, `rgba(235, 228, 220, ${this.s.backgroundBloom * 0.02})`);
      bgBloom.addColorStop(1, 'rgba(235, 228, 220, 0)');
      ctx.fillStyle = bgBloom;
      ctx.beginPath();
      ctx.arc(0, 0, bloomSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brightness flicker on exhale start
    const flickerMult = this.isExhaleStart ? 1.02 : 1;
    const glow = this.s.glowIntensity * flickerMult;

    // HDR bloom — 3.5x radius, volumetric presence
    const bloomR = currentRadius * 3.5;
    const warmR = Math.round(229 + this.s.colorTemp * 12);
    const warmG = Math.round(212 + this.s.colorTemp * 18);
    const warmB = Math.round(191 + this.s.colorTemp * 9);

    const hdrBloom = ctx.createRadialGradient(
      -currentRadius * 0.2, -currentRadius * 0.2, 0,
      0, 0, bloomR
    );
    hdrBloom.addColorStop(0, `rgba(${warmR}, ${warmG}, ${warmB}, ${glow * 0.06})`);
    hdrBloom.addColorStop(0.3, `rgba(${warmR}, ${warmG}, ${warmB}, ${glow * 0.03})`);
    hdrBloom.addColorStop(0.6, `rgba(235, 228, 220, ${glow * 0.015})`);
    hdrBloom.addColorStop(1, 'rgba(235, 228, 220, 0)');
    ctx.fillStyle = hdrBloom;
    ctx.beginPath();
    ctx.arc(0, 0, bloomR, 0, Math.PI * 2);
    ctx.fill();

    // Mid-range haze
    const hazeG = ctx.createRadialGradient(
      -currentRadius * 0.15, -currentRadius * 0.15, currentRadius * 0.5,
      0, 0, currentRadius * 2
    );
    hazeG.addColorStop(0, `rgba(232, 220, 200, ${this.s.glowIntensity * 0.12})`);
    hazeG.addColorStop(0.5, `rgba(235, 228, 220, ${this.s.glowIntensity * 0.06})`);
    hazeG.addColorStop(1, 'rgba(235, 228, 220, 0)');
    ctx.fillStyle = hazeG;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Environmental drop shadow
    ctx.globalAlpha = 0.12;
    const envShadow = ctx.createRadialGradient(
      currentRadius * 0.15, currentRadius * 0.15, 0,
      currentRadius * 0.15, currentRadius * 0.15, currentRadius * 1.4
    );
    envShadow.addColorStop(0, 'rgba(28, 26, 24, 0.25)');
    envShadow.addColorStop(0.6, 'rgba(28, 26, 24, 0.10)');
    envShadow.addColorStop(1, 'rgba(28, 26, 24, 0)');
    ctx.fillStyle = envShadow;
    ctx.beginPath();
    silhouette.forEach((p, i) => {
      const x = p.x * 1.1; const y = p.y * 1.1;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main stone body — warm ceramic gradient, upper-left lit
    // These exact color stops reproduce the ceramic surface from the reference prototype
    const bodyG = ctx.createRadialGradient(
      -currentRadius * 0.28, -currentRadius * 0.28, 0,
      0, 0, currentRadius * 1.35
    );
    bodyG.addColorStop(0.00, '#F8F0DC');
    bodyG.addColorStop(0.12, '#EFE6D0');
    bodyG.addColorStop(0.28, '#E5D8C0');
    bodyG.addColorStop(0.45, '#D8CAB0');
    bodyG.addColorStop(0.62, '#C4B8A0');
    bodyG.addColorStop(0.78, '#AEA090');
    bodyG.addColorStop(0.90, '#938A7D');
    bodyG.addColorStop(1.00, '#7D827E');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();

    // Infused body tint — additive warm wash stacked over the ceramic,
    // clipped to the silhouette. Amber-brown at the lit face fading to
    // nothing. Intensity driven by the lerped colorTemp so the tint
    // fades in during state entry. Gated to infused only; the base
    // ceramic gradient is locked per doc and must not be modified.
    // No colorTemp threshold — tintStrength clamps to 0 naturally when
    // colorTemp <= 0, so the effect fades in smoothly from state entry
    // instead of snapping on when the lerp crosses a gate.
    if (resolvedState === 'infused' && this.s.colorTemp > 0) {
      const tintStrength = Math.min(1, Math.max(0, this.s.colorTemp / 0.6));
      const tintG = ctx.createRadialGradient(
        -currentRadius * 0.3, -currentRadius * 0.3, 0,
        -currentRadius * 0.3, -currentRadius * 0.3, currentRadius * 1.4
      );
      tintG.addColorStop(0.00, `rgba(168, 108, 52, ${0.28 * tintStrength})`);
      tintG.addColorStop(0.35, `rgba(148, 92, 48, ${0.18 * tintStrength})`);
      tintG.addColorStop(0.70, `rgba(110, 78, 52, ${0.08 * tintStrength})`);
      tintG.addColorStop(1.00, 'rgba(80, 70, 55, 0)');
      ctx.fillStyle = tintG;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    // Directional sheen — sunlight moving across surface.
    // "Parchment" character: softer core, longer falloff, no spreading.
    // Gated out of shimmer (which uses the two-layer counter-rotating sweep
    // below) — except under reduced-motion, where the shimmer-specific
    // animated layers are suppressed, so we fall back to this single
    // static sheen so the state still reads as a glazed surface catching
    // light rather than a matte disc.
    const useStaticSheen =
      this.s.sheen > 0.01 &&
      (resolvedState !== 'shimmer' || this.reducedMotion);
    if (useStaticSheen) {
      const sheenPhase = (motionTs * 0.0004) % (Math.PI * 2);
      const sx = Math.cos(sheenPhase) * currentRadius * 0.4;
      const sy = Math.sin(sheenPhase) * currentRadius * 0.4;
      const sheenG = ctx.createRadialGradient(sx, sy, 0, sx, sy, currentRadius * 0.6);
      sheenG.addColorStop(0.0, `rgba(251, 248, 244, ${this.s.sheen * 0.15})`);
      sheenG.addColorStop(0.4, `rgba(251, 248, 244, ${this.s.sheen * 0.10})`);
      sheenG.addColorStop(0.8, `rgba(251, 248, 244, ${this.s.sheen * 0.04})`);
      sheenG.addColorStop(1.0, 'rgba(251, 248, 244, 0)');
      ctx.fillStyle = sheenG;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    // Shimmer double sheen — two counter-rotating wider/faster layers.
    // A single light source in a circle reads mechanical; two highlights
    // at different speeds in opposite directions create the visual
    // interference pattern of light bouncing off glazed ceramic.
    // Reduced-motion falls through to the single static sheen above.
    if (resolvedState === 'shimmer' && this.s.sheen > 0.01 && !this.reducedMotion) {
      // Layer A — forward, full opacity
      const phaseA = (timestamp * 0.0010) % (Math.PI * 2);
      const axA = Math.cos(phaseA) * currentRadius * 0.4;
      const ayA = Math.sin(phaseA) * currentRadius * 0.4;
      const sheenA = ctx.createRadialGradient(axA, ayA, 0, axA, ayA, currentRadius * 1.1);
      sheenA.addColorStop(0.0, `rgba(251, 248, 244, ${this.s.sheen * 0.22})`);
      sheenA.addColorStop(0.5, `rgba(251, 248, 244, ${this.s.sheen * 0.10})`);
      sheenA.addColorStop(1.0, 'rgba(251, 248, 244, 0)');
      ctx.fillStyle = sheenA;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();

      // Layer B — reverse, half opacity, slightly slower
      const phaseB = (-timestamp * 0.0007) % (Math.PI * 2);
      const axB = Math.cos(phaseB) * currentRadius * 0.4;
      const ayB = Math.sin(phaseB) * currentRadius * 0.4;
      const sheenB = ctx.createRadialGradient(axB, ayB, 0, axB, ayB, currentRadius * 1.1);
      sheenB.addColorStop(0.0, `rgba(251, 248, 244, ${this.s.sheen * 0.11})`);
      sheenB.addColorStop(0.5, `rgba(251, 248, 244, ${this.s.sheen * 0.05})`);
      sheenB.addColorStop(1.0, 'rgba(251, 248, 244, 0)');
      ctx.fillStyle = sheenB;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    // Inner shadow — depth, opposite corner from highlight
    const innerShadow = ctx.createRadialGradient(
      currentRadius * 0.35, currentRadius * 0.35, 0,
      0, 0, currentRadius
    );
    innerShadow.addColorStop(0, 'rgba(28, 26, 24, 0.20)');
    innerShadow.addColorStop(0.5, 'rgba(28, 26, 24, 0.08)');
    innerShadow.addColorStop(1, 'rgba(28, 26, 24, 0)');
    ctx.fillStyle = innerShadow;
    ctx.beginPath();
    silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();

    // Oval highlight — upper-left specular, the key to 3D ceramic feel
    const hlG = ctx.createRadialGradient(
      -currentRadius * 0.32, -currentRadius * 0.38, 0,
      -currentRadius * 0.32, -currentRadius * 0.38, currentRadius * 0.28
    );
    hlG.addColorStop(0, 'rgba(251, 248, 244, 0.50)');
    hlG.addColorStop(0.5, 'rgba(251, 248, 244, 0.18)');
    hlG.addColorStop(1, 'rgba(251, 248, 244, 0)');
    ctx.fillStyle = hlG;
    ctx.save();
    ctx.beginPath();
    ctx.scale(1, 0.65);
    ctx.arc(-currentRadius * 0.32, -currentRadius * 0.58, currentRadius * 0.28, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();

    // Artisan veining — blurred pigment clouds, not thin marble lines
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(139, 126, 111, 0.35)';
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = 'rgba(139, 126, 111, 0.6)';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.noise.get(i * 0.6, 0) * 3;
      const px = Math.cos(angle) * currentRadius * (0.3 + this.noise.get(i, 1) * 0.4);
      const py = Math.sin(angle) * currentRadius * (0.3 + this.noise.get(i, 2) * 0.4);
      const ps = currentRadius * (0.15 + this.noise.get(i, 3) * 0.1);
      ctx.beginPath();
      ctx.ellipse(px, py, ps, ps * (0.6 + this.noise.get(i, 4) * 0.4), angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Surface roughness — Perlin micro warm/cool variation. Relies on
    // `Math.random()` for position + size, so under reduced-motion we
    // skip the pass entirely; with the loop halted after one draw, the
    // grain would otherwise freeze as an arbitrary noise field rather
    // than reading as ceramic micro-texture (the effect depends on
    // per-frame averaging to look like a surface, not pixels).
    if (!this.reducedMotion) {
      ctx.globalAlpha = 0.035;
      for (let i = 0; i < 500; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * currentRadius;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        const rn = this.noise.get(x * 0.04, y * 0.04);
        ctx.fillStyle = rn > 0 ? 'rgba(28, 26, 24, 0.5)' : 'rgba(245, 240, 234, 0.5)';
        ctx.fillRect(x, y, Math.random() < 0.8 ? 1 : 2, Math.random() < 0.8 ? 1 : 2);
      }
      ctx.globalAlpha = 1;
    }

    // Prismatic spark — ready / shimmer. Under reduced-motion the phase
    // is pinned so the spark renders at a stable position; static light
    // reads as deliberate, a drifting speck in a frozen scene would not.
    if (this.s.spark > 0.01) {
      const sparkPhase = (motionTs * 0.0006) % (Math.PI * 2);
      const spx = Math.cos(sparkPhase) * currentRadius * 0.35;
      const spy = Math.sin(sparkPhase) * currentRadius * 0.35;
      const sparkG = ctx.createRadialGradient(spx, spy, 0, spx, spy, currentRadius * 0.4);
      sparkG.addColorStop(0, `rgba(255, 250, 240, ${this.s.spark * 0.35})`);
      sparkG.addColorStop(0.4, `rgba(245, 235, 220, ${this.s.spark * 0.18})`);
      sparkG.addColorStop(1, 'rgba(235, 224, 200, 0)');
      ctx.fillStyle = sparkG;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    // Playback inner pulse — syllable-like speech cadence.
    // State-gated so the speech rhythm never leaks into guidance or
    // infused during a state crossfade (both have their own pulse
    // personalities below). innerPulse is its own smooth gate via the
    // `pulseOp` multiplier — no hard threshold, which used to snap the
    // effect on ~100ms after entering playback (and flicker on entry
    // from ready, whose innerPulse target sits at exactly 0.3).
    // Suppressed under reduced-motion — the overlay is a time-varying
    // sine on its own, not a property that falls out of the snapshot.
    if (
      resolvedState === 'playback' &&
      this.s.innerPulse > 0.01 &&
      !this.reducedMotion
    ) {
      const s1 = (timestamp * 0.0025) % (Math.PI * 2);
      const s2 = (timestamp * 0.0042) % (Math.PI * 2);
      const rhythm = (Math.sin(s1) * 0.5 + 0.5) * (Math.sin(s2) * 0.4 + 0.6);
      const pulseOp = rhythm * 0.22 * this.s.innerPulse;
      const pulseG = ctx.createRadialGradient(0, 0, currentRadius * 0.25, 0, 0, currentRadius * 0.7);
      pulseG.addColorStop(0, `rgba(235, 224, 200, ${pulseOp})`);
      pulseG.addColorStop(0.6, `rgba(235, 224, 200, ${pulseOp * 0.4})`);
      pulseG.addColorStop(1, 'rgba(235, 224, 200, 0)');
      ctx.fillStyle = pulseG;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    // Guidance heartbeat — single slow sine pulse, distinct from
    // playback's double-sine speech cadence. Reads as a patient body
    // waiting, not as speech. Gated to guidance only, and suppressed
    // under reduced-motion (the "heartbeat" is literally the motion).
    if (
      resolvedState === 'guidance' &&
      this.s.innerPulse > 0.05 &&
      !this.reducedMotion
    ) {
      const heartbeat = Math.sin(timestamp * 0.0015) * 0.5 + 0.5;
      const pulseOp = heartbeat * 0.08 * this.s.innerPulse;
      const pulseG = ctx.createRadialGradient(
        0, 0, currentRadius * 0.3,
        0, 0, currentRadius * 0.65
      );
      pulseG.addColorStop(0, `rgba(235, 224, 200, ${pulseOp})`);
      pulseG.addColorStop(1, 'rgba(235, 224, 200, 0)');
      ctx.fillStyle = pulseG;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    // Infused concentric ripple — 6-second cycle, expanding from core
    // outward. Opacity fades as radius grows, then resets. "Stone
    // dropped in water" — inevitable, not random. Same period as the
    // ember glow oscillation so they breathe together. Gated to infused,
    // and suppressed under reduced-motion — the ripple IS the motion;
    // a frozen arbitrary phase would read as an unexplained halo.
    if (
      resolvedState === 'infused' &&
      this.s.innerPulse > 0.05 &&
      !this.reducedMotion
    ) {
      const ripplePhase = (timestamp % 6000) / 6000;               // 0 → 1
      const rippleRadius = currentRadius * (0.1 + ripplePhase * 0.8); // 0.1r → 0.9r
      const rippleOp = (1 - ripplePhase) * 0.22 * this.s.innerPulse;
      const rippleG = ctx.createRadialGradient(
        0, 0, rippleRadius * 0.25,
        0, 0, rippleRadius
      );
      rippleG.addColorStop(0.0, `rgba(235, 224, 200, ${rippleOp * 0.3})`);
      rippleG.addColorStop(0.7, `rgba(235, 224, 200, ${rippleOp})`);
      rippleG.addColorStop(1.0, 'rgba(235, 224, 200, 0)');
      ctx.fillStyle = rippleG;
      ctx.beginPath();
      silhouette.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Reduced-motion: paint exactly one frame per state change, no loop.
    // The next draw is triggered explicitly by `setState` or `resize`.
    if (this.reducedMotion) {
      this.animationId = null;
      return;
    }
    this.animationId = requestAnimationFrame(this.draw);
  };
}
