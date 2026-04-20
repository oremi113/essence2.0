'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import {
  CANVAS_H,
  CANVAS_W,
  SILENCE,
  TOTAL,
  createSealAnimationState,
  drawFrame,
} from './sealAnimationEngine';

export type SealAnimationMode = 'open' | 'sealed' | 'animate';

interface SealAnimationProps {
  /** Display size in CSS pixels. Canvas buffer is always 600×600. Default 320. */
  size?: number;
  /**
   * `'open'` = static open state.
   * `'sealed'` = static sealed state.
   * `'animate'` = plays open → sealed once, then holds for SILENCE ms before firing onComplete.
   */
  mode?: SealAnimationMode;
  /** Fires after animation completes (TOTAL + SILENCE). Only in `'animate'` mode. */
  onComplete?: () => void;
  className?: string;
}

export function SealAnimation({
  size = 320,
  mode = 'open',
  onComplete,
  className,
}: SealAnimationProps) {
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = createSealAnimationState();

    if (mode === 'open') {
      drawFrame(ctx, state, 0, true);
      return;
    }

    if (mode === 'sealed') {
      drawFrame(ctx, state, TOTAL, false);
      return;
    }

    // mode === 'animate'
    if (reducedMotion) {
      // Reduced-motion: jump straight to sealed, fire onComplete on the next
      // frame so consumers can still hook "animation done" to follow-up reveals.
      drawFrame(ctx, state, TOTAL, false);
      const raf = requestAnimationFrame(() => {
        onCompleteRef.current?.();
      });
      return () => cancelAnimationFrame(raf);
    }

    state.animating = true;
    let startTs: number | null = null;
    let rafId = 0;
    let completed = false;

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      drawFrame(ctx, state, Math.min(elapsed, TOTAL), false);
      if (elapsed < TOTAL + SILENCE) {
        rafId = requestAnimationFrame(tick);
      } else if (!completed) {
        completed = true;
        state.animating = false;
        drawFrame(ctx, state, TOTAL, false);
        onCompleteRef.current?.();
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      state.animating = false;
    };
  }, [mode, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className={className}
      // Canvas buffer vs. display size is a dimension contract, not styling.
      style={{ width: size, height: size }}
    />
  );
}
