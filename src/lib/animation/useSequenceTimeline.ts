/* eslint-disable react-hooks/refs -- Hook intentionally mirrors the latest phases array into a ref so scheduler effects read current onEnter callbacks without restarting the timeline. Reads are write-through; timer lifecycle is in useEffect. */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A single beat in a sequence timeline. The phase's `onEnter` (if any) fires
 * when the timeline advances into it, including on mount for the first phase.
 * `duration` is how long the phase holds before advancing; a duration of 0
 * (or the final phase) keeps the timeline parked on that phase.
 */
export interface SequencePhase<K extends string> {
  key: K;
  duration: number;
  onEnter?: () => void;
}

export interface SequenceTimelineOptions {
  autoStart?: boolean;
  /**
   * When true, the timeline is frozen: no timers are scheduled and onEnter
   * does not fire. Flipping back to false resumes scheduling from the
   * current phase (useful for prefers-reduced-motion gating).
   */
  paused?: boolean;
}

export interface SequenceTimelineControls<K extends string> {
  currentPhase: K;
  isComplete: boolean;
  start: () => void;
  skipTo: (phase: K) => void;
  reset: () => void;
}

/**
 * Drives an ordered list of phases using setTimeout, emitting a re-render
 * only on phase change. No requestAnimationFrame loop — consumers who need
 * progress within a phase should use CSS animations keyed off `currentPhase`.
 *
 * Timers clean up on unmount, on reset, and when skipTo jumps the timeline.
 */
export function useSequenceTimeline<K extends string>(
  phases: SequencePhase<K>[],
  options: SequenceTimelineOptions = {}
): SequenceTimelineControls<K> {
  const { autoStart = true, paused = false } = options;

  if (phases.length === 0) {
    throw new Error('useSequenceTimeline requires at least one phase');
  }

  // Phases array is captured in a ref so the scheduler can read the latest
  // onEnter callbacks without re-running the schedule every render. The
  // component passes new closures each render; we want those fresh callbacks
  // without restarting the timeline. Write-during-render is the intended
  // React pattern here — scheduling runs in useEffect, reads are effectively
  // snapshots of the current render.
  const phasesRef = useRef(phases);
  phasesRef.current = phases;

  const [currentIndex, setCurrentIndex] = useState<number>(autoStart ? 0 : -1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedOnEnterForIndexRef = useRef<number>(-1);

  const clearPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAdvance = useCallback((fromIndex: number) => {
    clearPending();
    const phase = phasesRef.current[fromIndex];
    if (!phase) return;
    const isLast = fromIndex >= phasesRef.current.length - 1;
    if (isLast || phase.duration <= 0) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCurrentIndex((i) => (i === fromIndex ? i + 1 : i));
    }, phase.duration);
  }, [clearPending]);

  // Fire onEnter for whatever index we land on, then schedule the advance.
  // Guarded by firedOnEnterForIndexRef so React Strict Mode double-effect
  // runs in dev don't double-fire onEnter.
  useEffect(() => {
    if (currentIndex < 0) return;
    if (paused) return;
    const phase = phasesRef.current[currentIndex];
    if (!phase) return;
    if (firedOnEnterForIndexRef.current !== currentIndex) {
      firedOnEnterForIndexRef.current = currentIndex;
      phase.onEnter?.();
    }
    scheduleAdvance(currentIndex);
    return clearPending;
  }, [currentIndex, paused, scheduleAdvance, clearPending]);

  const start = useCallback(() => {
    setCurrentIndex((i) => (i < 0 ? 0 : i));
  }, []);

  const skipTo = useCallback((phase: K) => {
    const idx = phasesRef.current.findIndex((p) => p.key === phase);
    if (idx < 0) return;
    clearPending();
    // Reset the guard so onEnter re-fires for the target phase even if
    // we're jumping to a phase we've already been through (reset flow).
    firedOnEnterForIndexRef.current = -1;
    setCurrentIndex(idx);
  }, [clearPending]);

  const reset = useCallback(() => {
    clearPending();
    firedOnEnterForIndexRef.current = -1;
    setCurrentIndex(autoStart ? 0 : -1);
  }, [autoStart, clearPending]);

  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const currentPhase = phasesRef.current[safeIndex].key;
  const isComplete = currentIndex >= phasesRef.current.length - 1;

  return { currentPhase, isComplete, start, skipTo, reset };
}
