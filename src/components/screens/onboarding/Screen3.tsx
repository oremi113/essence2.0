'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 3 — Who this is for ───────────────────────────────────

export function Screen3({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">This is for people who think ahead.</h1>

      <div className="onboarding-body">
        <p>
          Whether you have decades or a shorter window, your voice is something only you can give.
        </p>
        <p className="onboarding-body__emphasis">It deserves to last.</p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>That sounds like me</PrimaryButton>
      </div>
    </StepShell>
  );
}
