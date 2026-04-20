'use client';

import { useEffect, useState } from 'react';

export interface CopyCrossfadeResult<K> {
  /** The phase currently fading in / holding. */
  entering: K;
  /** The previous phase during its fade-out, or null once it has unmounted. */
  exiting: K | null;
}

export interface CopyCrossfadeOptions {
  /**
   * When true, the crossfade is skipped entirely — entering snaps to the
   * current phase and nothing is ever stamped into exiting. Intended for
   * `prefers-reduced-motion` consumers.
   */
  disabled?: boolean;
  /** Milliseconds before the exiting slot is released. Defaults to 500. */
  exitDurationMs?: number;
}

/**
 * Drives a two-slot copy crossfade: whenever `phase` changes, the previous
 * value is stamped into `exiting` (render that slot absolute-positioned so
 * it doesn't hold layout) while the new value takes the `entering` slot.
 * The exiting slot is released after `exitDurationMs`, at which point the
 * consumer can unmount it.
 *
 * Generic in the phase type so any enum/string union can drive the fade.
 */
export function useCopyCrossfade<K>(
  phase: K,
  { disabled = false, exitDurationMs = 500 }: CopyCrossfadeOptions = {}
): CopyCrossfadeResult<K> {
  // Track the previous phase in state so we can derive the crossfade
  // during render instead of via useEffect. Pattern endorsed by the
  // React docs for "react to prop changes" cases — the guard makes
  // this a single synchronous re-render per transition, not a loop.
  const [prev, setPrev] = useState<K>(phase);
  const [exiting, setExiting] = useState<K | null>(null);

  if (phase !== prev) {
    setPrev(phase);
    setExiting(disabled ? null : prev);
  }

  // Release the exiting slot after its fade-out window.
  useEffect(() => {
    if (exiting === null || disabled) return;
    const t = setTimeout(() => setExiting(null), exitDurationMs);
    return () => clearTimeout(t);
  }, [exiting, disabled, exitDurationMs]);

  return { entering: phase, exiting };
}
