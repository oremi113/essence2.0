'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 7 — Identity setup intro ──────────────────────────────

export function Screen7({ onNext }: { onNext: () => void }) {
  return (
    <StepShell centered>
      <StoneSlot />

      <div className="onboarding-phase-label">YOUR PROFILE</div>
      <h1 className="onboarding-title">Now, the part that&rsquo;s about you.</h1>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Get started</PrimaryButton>
      </div>
    </StepShell>
  );
}
