'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 7 — Identity setup intro ──────────────────────────────

export function Screen7({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <div className="onboarding-phase-label">YOUR PROFILE</div>
      <h1 className="onboarding-title">First, tell us a little about you.</h1>
      <p className="onboarding-subtitle">
        This helps us personalize your experience.
      </p>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Get started</PrimaryButton>
      </div>
    </StepShell>
  );
}
