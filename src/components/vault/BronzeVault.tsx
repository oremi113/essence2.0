'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { paintVaultFrame } from '@/lib/vault-render/paintVault';
import type { VaultDrive } from '@/lib/vault-render/vaultEngine';

// The canonical bronze reliquary vault, wrapped for the /app/vault ceremony
// screens. Drop-in replacement for the old gray <SealAnimation>: same three
// modes and the same size / onComplete contract, but it drives the canonical
// paintVaultFrame engine (src/lib/vault-render) instead of the retired
// sealAnimationEngine — so the whole app shows one vault.
//
// The engine is TRANSPARENT-ground by construction: paintVaultFrame clearRect's
// the backing store and drawVault composites onto it, filling no opaque box. On
// the gold (--color-bg-rich) reveal/sealed screens the vault reads directly on
// the ceremonial ground, no white/dark plate behind it.

export type BronzeVaultMode = 'open' | 'sealed' | 'animate';

// Seal ceremony timing (ms). Mirrors the canonical Step-3 seal
// (useSealTimeline SEAL_TIMING / SealVaultCanvas): the iris closes cool over
// IRIS, the ember catches EMBER_OFFSET after the iris completes, then the frame
// settles. Kept as a local mirror so this ceremony stays self-contained; if the
// canonical timing is retuned, update both (there is one source note in
// useSealTimeline).
const IRIS = 800;
const EMBER_OFFSET = 175; // ember catch, measured from iris-complete
const EMBER = 400;
const SETTLE = 300;
const EMBER_START = IRIS + EMBER_OFFSET; // 975
const EMBER_END = EMBER_START + EMBER; // 1375
const SETTLE_END = EMBER_END + SETTLE; // 1675 → onComplete

// (mechT, emberT) drive frames — the same three the Step-3 seal animates between.
const OPEN: VaultDrive = { mechT: 0, emberT: 0 }; // unsealed, cool
const SEALED: VaultDrive = { mechT: 1, emberT: 1 }; // iris shut, ember caught

// Newton-Raphson cubic-bezier sampler (same math as SealVaultCanvas /
// useShimmerLoop). The curve VALUES are read from the @theme tokens at mount so
// this stays a single source of truth with the canonical seal easing.
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

interface BronzeVaultProps {
  /** Display size in CSS pixels (square). Default 320. */
  size?: number;
  /**
   * `'open'` = static unsealed vessel.
   * `'sealed'` = static sealed + ignited vault.
   * `'animate'` = plays open → iris close → ember catch → settled once, then
   *   fires onComplete at the settle.
   */
  mode?: BronzeVaultMode;
  /** Fires when the seal ceremony settles (SETTLE_END). Only in `'animate'` mode. */
  onComplete?: () => void;
  className?: string;
}

export function BronzeVault({ size = 320, mode = 'open', onComplete, className }: BronzeVaultProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  // onComplete is read through a ref so changing it doesn't restart the animation.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Static frame, retried once if layout has not resolved (clientWidth 0).
    const paintStatic = (drive: VaultDrive) => {
      if (!paintVaultFrame(canvas, drive)) {
        const raf = requestAnimationFrame(() => paintVaultFrame(canvas, drive));
        return () => cancelAnimationFrame(raf);
      }
    };

    if (mode === 'open') return paintStatic(OPEN);
    if (mode === 'sealed') return paintStatic(SEALED);

    // mode === 'animate'
    if (reducedMotion) {
      // Reduced motion: jump straight to the settled frame, then fire onComplete
      // on the next frame so consumers can still gate a follow-up reveal.
      paintVaultFrame(canvas, SEALED);
      const raf = requestAnimationFrame(() => onCompleteRef.current?.());
      return () => cancelAnimationFrame(raf);
    }

    // Read the seal-easing curves from the @theme tokens (source of truth),
    // falling back to the known placeholder values if unreadable (SSR/jsdom).
    const cs = getComputedStyle(canvas);
    const irisCurve = parseBezier(cs.getPropertyValue('--ease-seal-iris')) || [0.4, 0, 0.2, 1];
    const emberCurve = parseBezier(cs.getPropertyValue('--ease-seal-ember')) || [0.2, 0, 0.5, 1];
    const easeIris = cubicBezier(...irisCurve);
    const easeEmber = cubicBezier(...emberCurve);

    let start: number | null = null;
    let rafId = 0;
    let completed = false;

    const loop = (now: number) => {
      if (start === null) start = now;
      const t = now - start;
      const mechT = t >= IRIS ? 1 : easeIris(Math.max(0, t) / IRIS);
      const emberT = t <= EMBER_START ? 0 : t >= EMBER_END ? 1 : easeEmber((t - EMBER_START) / EMBER);
      paintVaultFrame(canvas, { mechT, emberT });
      if (t < SETTLE_END) {
        rafId = requestAnimationFrame(loop);
      } else if (!completed) {
        completed = true;
        paintVaultFrame(canvas, SEALED); // pin the settled frame
        onCompleteRef.current?.();
      }
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [mode, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // Canvas backing store is sized by paintVaultFrame from the CSS box × DPR;
      // width/height here are the display box (a dimension contract, not styling).
      style={{ width: size, height: size }}
    />
  );
}
