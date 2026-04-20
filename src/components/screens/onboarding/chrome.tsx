/**
 * Onboarding chrome — the elements that wrap every screen but never
 * remount: progress dots, back button, persistent BreathStone, and the
 * shared step layout.
 *
 * Per-screen stone state + background tone is declarative (SCREEN_CONFIG);
 * the orchestrator just reads the entry for the current screen.
 */
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';
import { ChevronLeftIcon } from '@/components/icons';

export const TOTAL_SCREENS = 12;

export type BgKey = 'neutral' | 'warm-phase' | 'warm-1' | 'warm-2' | 'gold' | 'rich';

/**
 * Per-screen configuration. The stone is a continuous companion across
 * the entire onboarding — it never unmounts between screens; only its
 * animation state changes. Background phase shifts from cream (1–6) to
 * warm-phase oat (7–12) when setCurrentScreen flips to 7, choreographed
 * with the exit/enter animation. settleDelay is the ms delay before the
 * stone promotes to its non-idle target; screen 11's priming uses 600ms
 * to read as deliberate, others default to 500ms.
 */
export interface ScreenConfig {
  stone: BreathStoneState;
  bg: BgKey;
  settleDelay?: number;
}

export const SCREEN_CONFIG: Record<number, ScreenConfig> = {
  1:  { stone: 'idle',     bg: 'neutral' },
  2:  { stone: 'idle',     bg: 'neutral' },
  3:  { stone: 'idle',     bg: 'neutral' },
  4:  { stone: 'idle',     bg: 'neutral' },
  5:  { stone: 'ready',    bg: 'neutral' },
  6:  { stone: 'ready',    bg: 'neutral' },
  7:  { stone: 'guidance', bg: 'warm-phase' },
  8:  { stone: 'idle',     bg: 'warm-phase' },
  9:  { stone: 'idle',     bg: 'warm-phase' },
  10: { stone: 'idle',     bg: 'warm-phase' },
  11: { stone: 'priming',  bg: 'warm-phase', settleDelay: 600 },
  12: { stone: 'ready',    bg: 'warm-phase' },
};

const DEFAULT_SETTLE_DELAY_MS = 500;

// ─── ProgressDots ─────────────────────────────────────────────────

export function ProgressDots({ current }: { current: number }) {
  const dots = useMemo(() => Array.from({ length: TOTAL_SCREENS }), []);
  return (
    <div className="onboarding-progress" aria-hidden="true">
      {dots.map((_, i) => {
        const index = i + 1;
        let state = 'pending';
        if (index < current) state = 'completed';
        else if (index === current) state = 'active';
        return (
          <div key={i} className={`onboarding-dot onboarding-dot--${state}`} />
        );
      })}
    </div>
  );
}

// ─── BackButton ───────────────────────────────────────────────────

export function BackButton({
  visible,
  onBack,
  disabled,
}: {
  visible: boolean;
  onBack: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`onboarding-back ${visible ? '' : 'onboarding-back--hidden'}`}
      onClick={onBack}
      aria-label="Go back"
      disabled={disabled || !visible}
    >
      <ChevronLeftIcon size={20} />
    </button>
  );
}

// ─── StepShell ────────────────────────────────────────────────────

export function StepShell({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`onboarding-step ${centered ? 'onboarding-step--centered' : ''}`}>
      {children}
    </div>
  );
}

// ─── StoneSlot ────────────────────────────────────────────────────
// Empty layout slot that reserves the visual space the persistent
// stone occupies over the top of each screen. The actual BreathStone
// is rendered once at the wrapper level so it never remounts.

export function StoneSlot() {
  return <div className="onboarding-stone-slot" aria-hidden="true" />;
}

// ─── PersistentStone ──────────────────────────────────────────────
// Single BreathStone instance, mounted once for the entire onboarding.
// It never unmounts — only its `state` prop changes as screens advance,
// so the engine transitions in place rather than restarting. The
// cinematic intro (blur + scale-up) plays once on initial mount.
//
// Settle behavior: when a screen calls for a non-idle state, we pause
// briefly before promoting. Without that pause the engine can interpolate
// from its current params toward the new high-amplitude target, which
// reads as a rubberband — especially on first mount or when advancing
// from idle-heavy early screens into ready/guidance/priming.
//
// Override: a screen can push a short-lived stone state (e.g. Screen 10
// pulses `ready` on photo upload). Override applies immediately — no
// settle delay — because the user just acted, so there is no rubberband
// risk. Pass `null` to release.

export function PersistentStone({
  currentScreen,
  override,
}: {
  currentScreen: number;
  override?: BreathStoneState | null;
}) {
  const config = SCREEN_CONFIG[currentScreen];
  const target = config?.stone ?? 'idle';
  const delay = config?.settleDelay ?? DEFAULT_SETTLE_DELAY_MS;
  // Settled target for the current screen — the config target after
  // any settle delay has elapsed. The override is layered on top as
  // pure derivation so it applies synchronously without setState-in-
  // effect and releases naturally when the parent passes null.
  const [settled, setSettled] = useState<BreathStoneState>('idle');

  useEffect(() => {
    const effectiveDelay = target === 'idle' ? 0 : delay;
    const t = window.setTimeout(() => setSettled(target), effectiveDelay);
    return () => window.clearTimeout(t);
  }, [target, delay]);

  const display: BreathStoneState = override ?? settled;

  return (
    <div className="onboarding-persistent-stone" aria-hidden="true">
      <BreathStone state={display} size={144} />
    </div>
  );
}
