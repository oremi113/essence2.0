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
}

export function BreathStone({
  state,
  size = 280,
  className = '',
  onCelebrateEnd,
}: BreathStoneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BreathStoneEngine | null>(null);

  // Mount — create engine, size canvas, start loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BreathStoneEngine(canvas);
    engine.resize(size, size);
    engine.setState(state, onCelebrateEnd);
    engine.start();
    engineRef.current = engine;

    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State changes
  useEffect(() => {
    engineRef.current?.setState(state, onCelebrateEnd);
  }, [state, onCelebrateEnd]);

  // Size changes
  useEffect(() => {
    engineRef.current?.resize(size, size);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  );
}

export default BreathStone;
