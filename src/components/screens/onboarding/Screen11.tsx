'use client';

import { useEffect, useState } from 'react';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 11 — Priming moment (3500ms button unlock) ────────────
// The CTA is locked for the first 3500ms so the user spends that time
// breathing with the stone rather than tapping through. We use
// aria-disabled + tabIndex={-1} rather than the native `disabled`
// attribute so the button stays in the accessibility tree and screen
// readers announce its dimmed/locked state (the native `disabled`
// attribute hides it entirely).

export function Screen11Priming({ onNext }: { onNext: () => void }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setUnlocked(true), 3500);
    return () => clearTimeout(t);
  }, []);

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
