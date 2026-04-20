'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 5 — Why your voice matters ────────────────────────────

export function Screen5({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">There are things only your voice can carry.</h1>

      <div className="onboarding-body">
        <p>The way you say someone&rsquo;s name.</p>
        <p>The rhythm of how you tell a story.</p>
        <p>The warmth in your laugh.</p>
        <p className="onboarding-body__emphasis">
          These things can&rsquo;t be written down. But they can be kept.
        </p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}
