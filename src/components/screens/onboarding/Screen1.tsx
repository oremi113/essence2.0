'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 1 — Welcome ───────────────────────────────────────────

export function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <div className="onboarding-eyebrow">Welcome to ESSENCE</div>
      <h1 className="onboarding-title">Your voice is yours alone.</h1>
      <p className="onboarding-subtitle">
        We help you keep it safe for the people who matter most.
      </p>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}
