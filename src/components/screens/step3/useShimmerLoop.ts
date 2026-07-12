'use client';

import { useEffect, useRef } from 'react';

// Step 3 — the ground-shimmer primitive (Pass 3, mirrored from
// prototypes/essence-step3-processing-pass3.html). One opacity-driven
// --shimmer-intensity, computed each frame as base × breath on the ground
// layer only; the vault object never moves. No second intensity token is
// minted — the loop drives the existing --shimmer-intensity (carry-forward
// contract). Intensity IS the meaning: faint = waiting, active = working.

// Per-state bases (token-prep / Motion Spec §4). Read on the prototype ground;
// on-device re-tune against the oat surface is the remaining Pass 3 dial.
const FAINT = 0.05; // waiting
const ACTIVE = 0.12; // working — the breath ceiling
const NEUTRAL = 0.025; // neutral handoff frame (Pass 3 lock 2)
const RM_REST = 0.05; // reduced-motion faint rest (Motion Spec §6)

// Breath (lock 3): slow sine, ambient — not an ease. The state value is the
// CEILING; the sine only dips below it (active breathes ~0.09→0.12).
const BREATH_PERIOD = 7000;
const BREATH_DIP = 0.25;

// Climb (faint→active) and exit (active→neutral) tweens. CLIMB is the
// ceremonial rise as a transition tween; production paces the *register shift*
// to the fixed normal-wait window via the deferred Processing progression
// reducer (not the real gen elapsed, handoff §4). EXIT is the production
// release value (lock 1, ~1200ms via --ease-seal-exit).
const CLIMB_DUR = 2200;
const EXIT_DUR = 1200;

export type ShimmerActivation = 'off' | 'faint' | 'active' | 'neutral';

const BASE: Record<ShimmerActivation, number> = {
  off: 0,
  faint: FAINT,
  active: ACTIVE,
  neutral: NEUTRAL,
};

// cubic-bezier sampler mirroring --ease-seal-exit. The @theme token is the
// source of truth; this JS is its shadow — if the token value changes, change
// both (one curve, two homes). Same Newton-Raphson sampler as the prototype.
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const s = slope(t, p1x, p2x);
      if (s === 0) break;
      t -= (calc(t, p1x, p2x) - x) / s;
    }
    return t;
  };
  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : calc(solveX(x), p1y, p2y));
}

// Control points for --ease-seal-exit, mirrored here for the JS rAF exit. This
// is the dual home the spec warns about ("one curve, two homes"): if the
// @theme token changes, this must change too. tests/unit/step3-seal-exit-curve
// reads the token from globals.css and fails if they drift apart.
export const EASE_SEAL_EXIT_BEZIER = [0.4, 0, 0.2, 1] as const;

const easeExit = cubicBezier(...EASE_SEAL_EXIT_BEZIER); // --ease-seal-exit
const easeClimb = cubicBezier(0.4, 0, 0.2, 1); // ceremonial rise

interface Tween {
  from: number;
  to: number;
  start: number;
  dur: number;
  ease: (x: number) => number;
  kind: 'climb' | 'exit';
}

interface Engine {
  raf: number | null;
  breathing: boolean;
  base: number;
  anim: Tween | null;
  started: boolean;
}

// Drives --shimmer-intensity on the returned ref's element off the current
// activation. Transitions are auto-detected from the previous base:
// faint→active climbs, active→neutral eases down via --ease-seal-exit. The
// first activation after mount is applied instantly (no transition). Reduced
// motion renders the rest frame directly — no loop, no tween.
export function useShimmerLoop<T extends HTMLElement = HTMLDivElement>(
  activation: ShimmerActivation,
  reducedMotion: boolean,
) {
  const ref = useRef<T>(null);
  const engineRef = useRef<Engine>({ raf: null, breathing: false, base: 0, anim: null, started: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const eng = engineRef.current;

    const write = (v: number) => el.style.setProperty('--shimmer-intensity', v.toFixed(4));
    const stop = () => {
      if (eng.raf != null) {
        cancelAnimationFrame(eng.raf);
        eng.raf = null;
      }
    };

    const loop = (now: number) => {
      eng.raf = null;
      let base = eng.base;
      if (eng.anim) {
        let t = (now - eng.anim.start) / eng.anim.dur;
        if (t < 0) t = 0;
        const done = t >= 1;
        if (done) t = 1;
        base = eng.anim.from + (eng.anim.to - eng.anim.from) * eng.anim.ease(t);
        if (done) {
          const kind = eng.anim.kind;
          eng.anim = null;
          eng.base = base;
          if (kind === 'exit') {
            // Landed on the neutral handoff contract frame. Stop here — the
            // Reveal owns the pour and builds from this frame.
            eng.breathing = false;
            write(NEUTRAL);
            return;
          }
          // climb done → settle at the active ceiling and let breath carry on
          eng.base = ACTIVE;
        }
      }
      let mul = 1;
      if (eng.breathing) {
        const phase = (2 * Math.PI * (now % BREATH_PERIOD)) / BREATH_PERIOD;
        const d = 0.5 - 0.5 * Math.cos(phase); // 0 at ceiling, 1 at the trough
        mul = 1 - BREATH_DIP * d;
      }
      write(eng.base * mul);
      if (eng.anim || eng.breathing) eng.raf = requestAnimationFrame(loop);
    };

    // ── Reduced motion: render the rest frame directly (Motion Spec §6) ──
    if (reducedMotion) {
      stop();
      eng.anim = null;
      eng.breathing = false;
      const rest = activation === 'neutral' ? NEUTRAL : activation === 'off' ? 0 : RM_REST;
      eng.base = rest;
      eng.started = true;
      write(rest);
      return stop;
    }

    const target = BASE[activation];
    const prev = eng.base;
    const instant = !eng.started; // first application after mount is instant
    eng.started = true;

    if (activation === 'active') {
      eng.breathing = true;
      if (!instant && prev < ACTIVE) {
        eng.anim = { from: prev, to: ACTIVE, start: performance.now(), dur: CLIMB_DUR, ease: easeClimb, kind: 'climb' };
      } else {
        eng.anim = null;
        eng.base = ACTIVE;
      }
    } else if (activation === 'neutral') {
      eng.breathing = false;
      if (!instant && prev > NEUTRAL) {
        const from = prev > NEUTRAL ? prev : ACTIVE;
        eng.anim = { from, to: NEUTRAL, start: performance.now(), dur: EXIT_DUR, ease: easeExit, kind: 'exit' };
      } else {
        eng.anim = null;
        eng.base = NEUTRAL;
        write(NEUTRAL);
      }
    } else {
      // faint / off: settle static
      eng.breathing = false;
      eng.anim = null;
      eng.base = target;
      write(target);
    }

    stop();
    if (eng.anim || eng.breathing) eng.raf = requestAnimationFrame(loop);

    return stop;
  }, [activation, reducedMotion]);

  return ref;
}
