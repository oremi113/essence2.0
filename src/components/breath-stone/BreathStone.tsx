'use client';

import { useEffect, useRef } from 'react';
import { BreathStoneEngine } from './breathStoneEngine';
import type { BreathStoneState } from './breathStoneEngine';

export type { BreathStoneState };

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

  // Soft radial mask hides the canvas's rectangular corners. The engine
  // paints an ambient gradient + dust motes across the whole canvas rect
  // for depth, which reads as a visible "box" against a dark background.
  // Fully opaque through 80% of radius (comfortably past the stone's max
  // breath scale at 1.30), then fades to transparent by 98%.
  const maskStyle = {
    display: 'block',
    maskImage:
      'radial-gradient(circle, black 0%, black 80%, transparent 98%)',
    WebkitMaskImage:
      'radial-gradient(circle, black 0%, black 80%, transparent 98%)',
  } as const;

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
