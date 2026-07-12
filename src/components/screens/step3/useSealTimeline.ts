'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Step 3 seal — the single orchestrator (Motion Spec §3, mirrored from the
// Pass 2 prototype's RIG_STUB / SHELL split). One timeline, sequenced so the
// 175ms ember offset and the settle stay locked relative to each other:
//
//   RIG (vault-internal): iris 800 → +175 offset → ember 400 → settle 300
//                         = onSealed at 1675ms
//   SHELL (the only production-owned values): onSealed → dwell 2500 → crossfade
//
// Offsets are from t=0 at the confirmed-payment trigger.
export const SEAL_TIMING = {
  IRIS: 800,
  OFFSET: 175, // ember catch offset, measured from iris-complete
  EMBER: 400,
  SETTLE: 300,
  DWELL: 2500, // "Sealed" line holds after onSealed, then the seam crossfade
} as const;

const EMBER_START = SEAL_TIMING.IRIS + SEAL_TIMING.OFFSET; // 975
const EMBER_END = EMBER_START + SEAL_TIMING.EMBER; // 1375
const SETTLE_END = EMBER_END + SEAL_TIMING.SETTLE; // 1675 → onSealed

export type SealPhase = 'idle' | 'closing' | 'catching' | 'settling' | 'sealed' | 'handoff';
export type ActiveCopy = 'none' | 'seal' | 'proc' | 'pre';

interface SealCore {
  phase: SealPhase;
  preseal: boolean;
  rm: boolean;
  presealCaption: string | null;
}

export interface SealTimeline extends SealCore {
  // Derived readouts (mirrors of the phase, for the dev harness + AT).
  ember: 'cool' | 'ignited';
  shimmer: '0' | '0.05';
  seam: 'CardCapture' | 'Processing';
  guard: string;
  activeCopy: ActiveCopy;
  // Controls.
  play: () => void;
  showPreseal: (caption: string) => void;
  reset: () => void;
}

const IDLE: SealCore = { phase: 'idle', preseal: false, rm: false, presealCaption: null };

// `reducedMotion` is read at play() time. Production passes useReducedMotion();
// the /dev/seal harness passes its own toggle (a test affordance, Motion Spec
// §6 keeps ONE production source of truth — the hook).
export function useSealTimeline(reducedMotion: boolean): SealTimeline {
  const [core, setCore] = useState<SealCore>(IDLE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // Clean up any pending timers on unmount.
  useEffect(() => clear, [clear]);

  const reset = useCallback(() => {
    clear();
    setCore(IDLE);
  }, [clear]);

  // SHELL: onSealed → dwell → crossfade. The only production-owned timeline.
  const runShellDwell = useCallback(() => {
    at(SEAL_TIMING.DWELL, () => setCore((s) => ({ ...s, phase: 'handoff' })));
  }, [at]);

  const play = useCallback(() => {
    clear();
    if (reducedMotion) {
      // Reduced motion: no rig animation. Render the settled frame directly
      // ([data-rm] kills the transitions), then run the SAME shell, instant.
      setCore({ phase: 'sealed', preseal: false, rm: true, presealCaption: null });
      runShellDwell();
      return;
    }
    // RIG: close → catch (+175 after iris) → settle → onSealed.
    setCore({ phase: 'closing', preseal: false, rm: false, presealCaption: null });
    at(EMBER_START, () => setCore((s) => ({ ...s, phase: 'catching' })));
    at(EMBER_END, () => setCore((s) => ({ ...s, phase: 'settling' })));
    at(SETTLE_END, () => {
      setCore((s) => ({ ...s, phase: 'sealed' }));
      runShellDwell();
    });
  }, [clear, reducedMotion, at, runShellDwell]);

  // §SEAL-INTEGRITY: a pre-seal integrity panel that can never reach a seal —
  // establish, cool ember, shimmer 0, no copy but the caption.
  const showPreseal = useCallback(
    (caption: string) => {
      clear();
      setCore({ phase: 'idle', preseal: true, rm: false, presealCaption: caption });
    },
    [clear],
  );

  const { phase, preseal } = core;
  const ignited = phase === 'catching' || phase === 'settling' || phase === 'sealed' || phase === 'handoff';

  return {
    ...core,
    ember: ignited ? 'ignited' : 'cool',
    shimmer: phase === 'sealed' || phase === 'handoff' ? '0.05' : '0',
    seam: phase === 'handoff' ? 'Processing' : 'CardCapture',
    guard: preseal ? 'no seal: unsealed, cool ember, shimmer 0' : 'seal gated to confirmed',
    activeCopy: preseal
      ? 'pre'
      : phase === 'handoff'
        ? 'proc'
        : phase === 'settling' || phase === 'sealed'
          ? 'seal'
          : 'none',
    play,
    showPreseal,
    reset,
  };
}
