'use client';

import { useEffect, useRef } from 'react';
import { BreathStoneEngine } from './breathStoneEngine';
import type { BreathStoneState } from './breathStoneEngine';

export type { BreathStoneState };

// ─── CANVAS EDGE MASK ───────────────────────────────────────────────────────
// The engine paints for depth across the whole canvas rect: an ambient
// gradient, a directional wash, a playback vignette, drifting motes — plus the
// stone's own HDR bloom (3.5x radius) and haze (2x), both of which legitimately
// overshoot the rect. All of it is cut off by the canvas boundary, and a
// straight cut through a non-zero alpha is what reads as a visible "box" on a
// dark ground.
//
// This mask feathers that cut. Three things make it work:
//
//   • `closest-side` — without a size keyword the gradient defaults to
//     farthest-corner, which on a square canvas puts 100% out at the DIAGONAL.
//     The edge midpoints then sit at only 70.7%, i.e. inside the fully-opaque
//     region, so they never faded at all. Only the corners softened. That was
//     the bug: a square with rounded corners, which is exactly the artifact the
//     mask was added to prevent. `closest-side` puts 100% on the nearest edge.
//
//   • It reaches full transparency at exactly 100%, so there is no hard cut
//     left anywhere on the boundary — and everything past it (the corners, at
//     141%) is gone outright.
//
//   • The falloff is back-loaded rather than linear. Measured on the 140px
//     ceremony stone, the widest the stone body ever gets is 84.3% of the
//     half-width (recording, at a breath peak with voice reactivity and
//     silhouette irregularity all stacking); every other state stays under 75%.
//     So the mask holds ~full opacity through the mid-80s and does its real
//     work in the last 10%, where only the faint overshoot lives. A linear
//     ramp from the mid-60s would have dimmed the stone's own rim.
//
// If the stone's geometry changes — baseRadius (0.28), the 1.30 breath clamp,
// recording's voiceReactive or irregularity — re-measure before trusting these
// stops. /dev/breath-stone renders every state on a dark ground for exactly
// this check.
const EDGE_MASK =
  'radial-gradient(closest-side, ' +
  '#000 0%, #000 84%, ' +
  'rgba(0,0,0,0.94) 90%, ' +
  'rgba(0,0,0,0.72) 95%, ' +
  'transparent 100%)';

const maskStyle = {
  display: 'block',
  maskImage: EDGE_MASK,
  WebkitMaskImage: EDGE_MASK,
} as const;

interface BreathStoneProps {
  state: BreathStoneState;
  /** Size in pixels. Canvas renders square at this dimension. Default: 280 */
  size?: number;
  className?: string;
  /** Called when celebrate animation completes and stone returns to idle */
  onCelebrateEnd?: () => void;
  /** When true, freezes breath amplitude to 0 and suppresses all overlay
   *  animations (sheen sweeps, bloom expansion, shimmer rotations, ember
   *  pulses, ripple rings). Static properties (glow, color temp, spark)
   *  still reflect the target state. Pair with
   *  `useReducedMotion` so the canvas honors
   *  `(prefers-reduced-motion: reduce)` alongside CSS animations. */
  reducedMotion?: boolean;
}

export function BreathStone({
  state,
  size = 280,
  className = '',
  onCelebrateEnd,
  reducedMotion = false,
}: BreathStoneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BreathStoneEngine | null>(null);

  // Mount — create engine, size canvas, start loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BreathStoneEngine(canvas);
    engine.resize(size, size);
    engine.setState(state, { onCelebrateEnd, reducedMotion });
    engine.start();
    engineRef.current = engine;

    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State + reduced-motion changes. Bundled so toggling the system setting
  // mid-session re-enters setState's branch that snaps to target and halts
  // the loop (or resumes it).
  useEffect(() => {
    engineRef.current?.setState(state, { onCelebrateEnd, reducedMotion });
  }, [state, onCelebrateEnd, reducedMotion]);

  // Size changes
  useEffect(() => {
    engineRef.current?.resize(size, size);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={maskStyle}
      aria-hidden="true"
    />
  );
}

export default BreathStone;
