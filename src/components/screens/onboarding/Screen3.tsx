'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 3 — Who this is for ───────────────────────────────────

export function Screen3({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">This is for people who plan ahead.</h1>

      <div className="onboarding-body">
        <p>Parents who want their grandchildren to hear their voice.</p>
        <p>Partners who want to leave love notes for special days.</p>
        <p>Whether you have all the time in the world, or not.</p>
        <p className="onboarding-body__emphasis">Your voice deserves to last.</p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>That sounds like me</PrimaryButton>
      </div>
    </StepShell>
  );
}
