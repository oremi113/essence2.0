'use client';

import { useEffect, useRef } from 'react';
import { paintVaultFrame } from '@/lib/vault-render/paintVault';
import { SEAL_TIMING, type SealPhase } from './useSealTimeline';

// The seal vault — ONE canvas that plays the iris-close internally, replacing
// the Pass-2 three-layer opacity cross-dissolve (.v-establish/.v-sealed-cool/
// .v-sealed). It renders the engine's two drive axes (DC1) off a single clock:
//
//   IRIS CLOSE (0–800ms)        mechT 0→1, --ease-seal-iris. Ember stays cool.
//   EMBER CATCH (975–1375ms)    emberT 0→1, --ease-seal-ember. The pilot catches.
//   SETTLE / SEALED / HANDOFF   pinned at {1,1}, dead-still.
//
// Timing mirrors useSealTimeline (the orchestrator owns copy/shimmer/onSealed
// and fires the discrete data-phase beats; this owns the continuous vault motion
// between them). Both run off the same trigger, so they stay locked. The canvas
// reads cool through the whole close and ignites only at the catch
// (§EMBER-TIMING); pre-seal and idle render the cool open vessel, never a seal
// (§SEAL-INTEGRITY). RM renders the settled frame once, no loop.

const IRIS = SEAL_TIMING.IRIS; // 800
const EMBER_START = SEAL_TIMING.IRIS + SEAL_TIMING.OFFSET; // 975
const EMBER_END = EMBER_START + SEAL_TIMING.EMBER; // 1375

// Newton-Raphson cubic-bezier sampler (same math as useShimmerLoop). The VALUE
// is read from the @theme token at mount (single source of truth — no dual-home
// drift); only this sampler algorithm is local.
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const Cc = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + Cc(a)) * t;
  const slope = (t: number, a: number, b: number) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + Cc(a);
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

function parseBezier(value: string): [number, number, number, number] | null {
  const m = value.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return null;
  const n = m[1].split(',').map((s) => parseFloat(s.trim()));
  return n.length === 4 && n.every((v) => Number.isFinite(v)) ? (n as [number, number, number, number]) : null;
}

interface SealVaultCanvasProps {
  phase: SealPhase;
  preseal: boolean;
  rm: boolean;
}

export function SealVaultCanvas({ phase, preseal, rm }: SealVaultCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const easeRef = useRef<{ iris: (x: number) => number; ember: (x: number) => number } | null>(null);

  // Read the curve tokens once, from the CSS custom properties (the source of
  // truth). Falls back to the known placeholder values if unreadable (SSR/jsdom).
  useEffect(() => {
    const el = ref.current;
    const cs = el ? getComputedStyle(el) : null;
    const iris = (cs && parseBezier(cs.getPropertyValue('--ease-seal-iris'))) || [0.4, 0, 0.2, 1];
    const ember = (cs && parseBezier(cs.getPropertyValue('--ease-seal-ember'))) || [0.2, 0, 0.5, 1];
    easeRef.current = { iris: cubicBezier(...iris), ember: cubicBezier(...ember) };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const stop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const paint = (mechT: number, emberT: number) => {
      const ok = paintVaultFrame(canvas, { mechT, emberT });
      canvas.dataset.mechT = mechT.toFixed(2);
      canvas.dataset.emberT = emberT.toFixed(2);
      return ok;
    };
    // Retry the first paint once if layout has not resolved (clientWidth 0).
    const paintStatic = (mechT: number, emberT: number) => {
      if (!paint(mechT, emberT)) {
        rafRef.current = requestAnimationFrame(() => paint(mechT, emberT));
      }
    };

    // ── Static frames ───────────────────────────────────────────────────
    // Cool open vessel: idle + the pre-seal integrity panel (never a seal).
    if (preseal || phase === 'idle') {
      stop();
      startRef.current = null;
      paintStatic(0, 0);
      return stop;
    }
    // Settled frame: reduced motion (jumped straight here) or the end of the
    // run (settling/sealed/handoff hold dead-still at {1,1}).
    if (rm || phase === 'settling' || phase === 'sealed' || phase === 'handoff') {
      stop();
      startRef.current = null;
      paintStatic(1, 1);
      return stop;
    }

    // ── Animated: closing / catching ────────────────────────────────────
    // One clock from the first 'closing'. The clock persists across the
    // closing→catching effect re-runs (startRef), so motion is continuous.
    if (startRef.current == null) startRef.current = performance.now();
    const ease = easeRef.current ?? { iris: (x: number) => x, ember: (x: number) => x };
    const loop = (now: number) => {
      const t = now - (startRef.current as number);
      const mechT = t >= IRIS ? 1 : ease.iris(Math.max(0, t) / IRIS);
      const emberT = t <= EMBER_START ? 0 : t >= EMBER_END ? 1 : ease.ember((t - EMBER_START) / SEAL_TIMING.EMBER);
      paint(mechT, emberT);
      if (t < EMBER_END) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
        paint(1, 1); // pin the settled frame; settling/sealed effects hold it
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return stop;
  }, [phase, preseal, rm]);

  // Decorative — the aria-live copy + readouts carry seal state. `id` + the
  // data-mech-t/data-ember-t mirrors are the seal.spec DOM contract.
  return (
    <canvas
      ref={ref}
      id="seal-vault"
      className="step3-vault seal-vault-canvas"
      aria-hidden="true"
      data-mech-t="0"
      data-ember-t="0"
    />
  );
}
