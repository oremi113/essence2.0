'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 11 — Priming moment (button locked during the stone's breath) ──
// The CTA is locked for SCREEN11_BUTTON_UNLOCK_MS so the user spends that
// time breathing with the stone rather than tapping through. We use
// aria-disabled + tabIndex={-1} rather than the native `disabled`
// attribute so the button stays in the accessibility tree and screen
// readers announce its dimmed/locked state (the native `disabled`
// attribute hides it entirely).
//
// Reduced-motion: the lock is meaningless without the stone's breath
// cue, so we start unlocked and render the button active on mount.
// The priming-hint copy ("Breathe with the stone for a moment") is
// hidden via CSS in the same mode — see globals.css.

export function Screen11Priming({ onNext }: { onNext: () => void }) {
  const reducedMotion = useReducedMotion();
  const [timerFired, setTimerFired] = useState(false);
  // Derive `unlocked` rather than duplicating it into state — lets the
  // mid-session system toggle from "RM off" to "RM on" immediately release
  // the lock without re-running the effect to mutate state.
  const unlocked = timerFired || reducedMotion;

  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(
      () => setTimerFired(true),
      ONBOARDING_TIMING.SCREEN11_BUTTON_UNLOCK_MS
    );
    return () => clearTimeout(t);
  }, [reducedMotion]);

  const isLocked = !unlocked;

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Take a breath.</h1>
      <p className="onboarding-priming-hint">
        Breathe with the stone for a moment.
      </p>

      <div className="onboarding-body">
        <p>In a moment, you&rsquo;ll start recording your voice.</p>
        <p>Think of it like leaving a voicemail for someone you love.</p>
      </div>

      <div
        className={`onboarding-ctas ${unlocked ? 'onboarding-ctas--unlocked' : 'onboarding-ctas--locked'}`}
      >
        <button
          type="button"
          className="btn-primary btn--full"
          aria-disabled={isLocked}
          tabIndex={isLocked ? -1 : 0}
          onClick={(e) => {
            if (isLocked) {
              e.preventDefault();
              return;
            }
            onNext();
          }}
          onKeyDown={(e) => {
            if (isLocked && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
            }
          }}
        >
          Begin setup
        </button>
      </div>
    </StepShell>
  );
}
